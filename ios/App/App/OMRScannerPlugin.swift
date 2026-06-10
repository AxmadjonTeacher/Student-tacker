import Foundation
import Capacitor

@objc(OMRScannerPlugin)
public class OMRScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier  = "OMRScannerPlugin"
    public let jsName      = "OMRScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "captureAndProcess", returnType: CAPPluginReturnPromise),
    ]

    private let processor = OMRProcessor()

    @objc func captureAndProcess(_ call: CAPPluginCall) {
        guard
            let base64    = call.getString("base64"),
            let imageData = Data(base64Encoded: base64),
            let uiImage   = UIImage(data: imageData)
        else {
            call.reject("Invalid image data")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            let result = self.processor.process(image: uiImage)

            DispatchQueue.main.async {
                switch result {
                case .success(let sheet):
                    call.resolve([
                        "studentId":  sheet.studentId,
                        "answers":    sheet.answers,
                        "confidence": sheet.confidence,
                        "aligned":    sheet.aligned,
                    ])
                case .failure(let err):
                    call.reject(err.localizedDescription)
                }
            }
        }
    }
}
