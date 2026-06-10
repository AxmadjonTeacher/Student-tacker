import Vision
import CoreImage
import UIKit

// MARK: - Data Types

struct OMRSheet {
    let studentId:  String
    let answers:    [String]
    let confidence: [Double]
    let aligned:    Bool
}

enum OMRError: LocalizedError {
    case warpFailed
    case noImageContext

    var errorDescription: String? {
        switch self {
        case .warpFailed:     return "Perspective warp failed"
        case .noImageContext: return "Could not create Core Image context"
        }
    }
}

// MARK: - Coordinate Constants (mirror of omr_coordinates.json)

private enum OMRCoords {
    static let templateW: CGFloat = 750
    static let templateH: CGFloat = 1000

    // Questions 1–13: A=161, B=210, C=259, D=308 | row Y start=154, step=63.24
    static let leftX:  [CGFloat] = [161, 210, 259, 308]
    static let leftYs: [CGFloat] = (0..<13).map { 154.0 + CGFloat($0) * 63.24 }

    // Questions 14–15: A=408, B=457, C=506, D=555
    static let rightX:  [CGFloat] = [408, 457, 506, 555]
    static let rightYs: [CGFloat] = (0..<2).map { 154.0 + CGFloat($0) * 63.24 }

    // Student ID grid: cols=[548,597,646], digits 0–9 start at y=431, step=46.5
    static let idX:  [CGFloat] = [548, 597, 646]
    static let idYs: [CGFloat] = (0..<10).map { 431.0 + CGFloat($0) * 46.5 }

    static let bubbleInnerR: CGFloat = 7
    static let bubbleOuterR: CGFloat = 11
}

// MARK: - Processor

final class OMRProcessor {

    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])

    func process(image: UIImage) -> Result<OMRSheet, Error> {
        guard let cgImage = image.cgImage else { return .failure(OMRError.warpFailed) }

        // Step 1: Detect sheet rectangle with Vision
        let rectObs = detectRectangle(in: cgImage)

        // Step 2: Perspective-correct to 750×1000 canonical space
        let warped: CIImage
        if let obs = rectObs {
            let ci = CIImage(cgImage: cgImage)
            warped = perspectiveCorrect(ci, observation: obs)
        } else {
            warped = CIImage(cgImage: cgImage)
        }

        // Step 3: Scale to canonical template size
        let sx = OMRCoords.templateW / warped.extent.width
        let sy = OMRCoords.templateH / warped.extent.height
        let scaled = warped.transformed(by: CGAffineTransform(scaleX: sx, y: sy))

        // Step 4: Grayscale + binarize (threshold = 0.42)
        let binary = scaled
            .applyingFilter("CIColorControls", parameters: ["inputSaturation": 0.0])
            .applyingFilter("CIColorThreshold", parameters: ["inputThreshold": 0.42])

        guard let binaryCG = ciContext.createCGImage(binary, from: binary.extent) else {
            return .failure(OMRError.noImageContext)
        }

        // Step 5: Sample answer bubbles
        let answers = sampleQuestions(in: binaryCG)

        // Step 6: Sample student ID grid
        let studentId = sampleStudentId(in: binaryCG)

        return .success(OMRSheet(
            studentId:  studentId,
            answers:    answers.map { $0.letter },
            confidence: answers.map { $0.confidence },
            aligned:    rectObs != nil
        ))
    }

    // MARK: - Vision Rectangle Detection

    private func detectRectangle(in cgImage: CGImage) -> VNRectangleObservation? {
        let request = VNDetectRectanglesRequest()
        request.minimumAspectRatio  = 0.55
        request.maximumAspectRatio  = 0.85
        request.minimumConfidence   = 0.75
        request.maximumObservations = 1

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
        return request.results?.first
    }

    // MARK: - Core Image Perspective Correction

    private func perspectiveCorrect(_ ci: CIImage, observation obs: VNRectangleObservation) -> CIImage {
        let w = ci.extent.width
        let h = ci.extent.height

        // VN coords: normalized [0,1], origin bottom-left. CIImage: pixel origin bottom-left.
        func toCI(_ p: CGPoint) -> CIVector { CIVector(x: p.x * w, y: p.y * h) }

        let filter = CIFilter.perspectiveCorrection()
        filter.inputImage  = ci
        filter.topLeft     = toCI(obs.topLeft)
        filter.topRight    = toCI(obs.topRight)
        filter.bottomLeft  = toCI(obs.bottomLeft)
        filter.bottomRight = toCI(obs.bottomRight)
        return filter.outputImage ?? ci
    }

    // MARK: - Bubble Sampling (mirrors omrScanner.ts density algorithm)

    private struct BubbleResult { let letter: String; let confidence: Double }

    private func sampleQuestions(in image: CGImage) -> [BubbleResult] {
        // Build coordinate list: 13 rows on left + 2 rows on right
        var coords: [(xs: [CGFloat], y: CGFloat)] = []
        for y in OMRCoords.leftYs  { coords.append((OMRCoords.leftX,  y)) }
        for y in OMRCoords.rightYs { coords.append((OMRCoords.rightX, y)) }

        return coords.map { (xs, y) in
            var innerDensities: [Double] = []
            var allOuterVals:   [UInt8]  = []

            for x in xs {
                let (inner, outer) = sampleBubble(in: image, cx: x, cy: y)
                innerDensities.append(inner)
                allOuterVals.append(contentsOf: outer)
            }

            guard !allOuterVals.isEmpty else {
                return BubbleResult(letter: "?", confidence: 0)
            }

            let minOuter = Double(allOuterVals.min()!)
            let maxOuter = Double(allOuterVals.max()!)
            let contrast = maxOuter - minOuter
            let threshold = (minOuter + 0.45 * contrast) / 255.0

            // Lowest inner density = darkest = filled bubble
            guard let minDensity = innerDensities.min(),
                  let minIdx     = innerDensities.firstIndex(of: minDensity) else {
                return BubbleResult(letter: "?", confidence: 0)
            }

            let sorted    = innerDensities.sorted()
            let secondMin = sorted.dropFirst().first ?? 1.0
            let margin    = secondMin - minDensity

            if contrast > 25 && minDensity < threshold && margin > 0.12 {
                let letter = ["A","B","C","D"][minIdx]
                return BubbleResult(letter: letter, confidence: min(1.0, margin * 3))
            }
            return BubbleResult(letter: "?", confidence: 0)
        }
    }

    private func sampleStudentId(in image: CGImage) -> String {
        var digits: [String] = []

        for x in OMRCoords.idX {
            var bestDigit   = "?"
            var bestDensity = 1.0

            for (i, y) in OMRCoords.idYs.enumerated() {
                let (density, _) = sampleBubble(in: image, cx: x, cy: y)
                if density < bestDensity {
                    bestDensity = density
                    bestDigit   = "\(i)"
                }
            }
            digits.append(bestDigit)
        }
        return digits.joined()
    }

    // Returns (meanInnerDensity 0–1, outerPixelValues)
    // Low density = dark pixels = filled bubble
    private func sampleBubble(
        in image: CGImage,
        cx: CGFloat,
        cy: CGFloat
    ) -> (Double, [UInt8]) {
        let ri = Int(OMRCoords.bubbleInnerR)
        let ro = Int(OMRCoords.bubbleOuterR)
        let x0 = max(0, Int(cx) - ro)
        let y0 = max(0, Int(cy) - ro)
        let x1 = min(image.width  - 1, Int(cx) + ro)
        let y1 = min(image.height - 1, Int(cy) + ro)

        guard x0 < x1, y0 < y1 else { return (1.0, []) }

        let cropRect = CGRect(x: x0, y: y0, width: x1 - x0, height: y1 - y0)
        guard let cropped = image.cropping(to: cropRect) else { return (1.0, []) }

        let w = cropped.width
        let h = cropped.height
        var pixels = [UInt8](repeating: 0, count: w * h)
        let grayCS = CGColorSpaceCreateDeviceGray()

        guard let ctx = CGContext(
            data: &pixels, width: w, height: h,
            bitsPerComponent: 8, bytesPerRow: w,
            space: grayCS, bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else { return (1.0, []) }

        ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: w, height: h))

        let lcx = cx - CGFloat(x0)
        let lcy = cy - CGFloat(y0)
        var innerSum   = 0.0; var innerCount = 0
        var outerVals: [UInt8] = []

        for py in 0..<h {
            for px in 0..<w {
                let dx   = CGFloat(px) - lcx
                let dy   = CGFloat(py) - lcy
                let dist = sqrt(dx * dx + dy * dy)
                let v    = pixels[py * w + px]

                if dist <= CGFloat(ri) {
                    innerSum  += Double(v) / 255.0
                    innerCount += 1
                } else if dist <= CGFloat(ro) {
                    outerVals.append(v)
                }
            }
        }

        let innerDensity = innerCount > 0 ? innerSum / Double(innerCount) : 1.0
        return (innerDensity, outerVals)
    }
}
