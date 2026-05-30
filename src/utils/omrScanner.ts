export interface Point {
  x: number;
  y: number;
}

export interface OMRParsedResult {
  studentIdCode: string;
  answers: string[];
  correctCount?: number;
  percentage?: number;
}

// Fixed coordinates in the standardized 646 x 903 warped template
export const TEMPLATE_WIDTH = 646;
export const TEMPLATE_HEIGHT = 903;

// Centroids of the 4 outer corner fiducial markers in the template
export const TEMPLATE_TL: Point = { x: 17.0, y: 55.0 };
export const TEMPLATE_TR: Point = { x: 628.0, y: 55.0 };
export const TEMPLATE_BL: Point = { x: 17.0, y: 884.5 };
export const TEMPLATE_BR: Point = { x: 628.1, y: 884.5 };

// Coordinate Maps
export const BUBBLE_RADIUS = 9; // radius for darkness check

// Left column questions (1 to 13)
export const QUESTIONS_LEFT_X = [130, 174, 218, 262]; // A, B, C, D
export const QUESTIONS_LEFT_Y_START = 161;
export const QUESTIONS_LEFT_Y_STEP = 56.33;

// Right column questions (14 to 15)
export const QUESTIONS_RIGHT_X = [352, 396, 440, 484]; // A, B, C, D
export const QUESTIONS_RIGHT_Y_START = 161;
export const QUESTIONS_RIGHT_Y_STEP = 56.33;

// Student ID Grid (3 columns of digits 0 to 9)
export const STUDENT_ID_X = [479, 523, 567]; // Digit Columns 1, 2, 3
export const STUDENT_ID_Y_START = 408;
export const STUDENT_ID_Y_STEP = 41.33;

/**
 * Finds the centroid of a dark fiducial marker in a search window of a canvas.
 * Uses adaptive grayscale conversion, dynamic thresholding, and BFS connected
 * component search. Designed to be very forgiving of different lighting and
 * camera distances for ZipGrade-style instant scanning.
 */
export function findMarkerCentroid(
  ctx: CanvasRenderingContext2D,
  searchX: number,
  searchY: number,
  radius: number
): Point | null {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  // Define bounding box of search window, clamped to canvas bounds
  const xMin = Math.max(0, Math.floor(searchX - radius));
  const xMax = Math.min(canvasWidth - 1, Math.ceil(searchX + radius));
  const yMin = Math.max(0, Math.floor(searchY - radius));
  const yMax = Math.min(canvasHeight - 1, Math.ceil(searchY + radius));

  const winW = xMax - xMin + 1;
  const winH = yMax - yMin + 1;

  if (winW <= 0 || winH <= 0) return null;

  // Get image data for the window
  const imgData = ctx.getImageData(xMin, yMin, winW, winH);
  const data = imgData.data;

  // Convert window to grayscale and find min/max intensity
  const gray = new Uint8Array(winW * winH);
  let minVal = 255;
  let maxVal = 0;

  for (let i = 0; i < winW * winH; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const val = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    gray[i] = val;
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }

  // Contrast check: relaxed to handle various lighting (lowered from 45 to 25)
  if (maxVal - minVal < 25) {
    return null;
  }

  // Threshold: pixels darker than local ratio are considered black
  const threshold = minVal + 0.40 * (maxVal - minVal);
  const binary = new Uint8Array(winW * winH);
  for (let i = 0; i < winW * winH; i++) {
    binary[i] = gray[i] < threshold ? 1 : 0;
  }

  // Breadth-First Search (BFS) to find connected components of black pixels
  const visited = new Uint8Array(winW * winH);
  const components: Array<{ points: Point[]; width: number; height: number; area: number }> = [];

  for (let y = 0; y < winH; y++) {
    for (let x = 0; x < winW; x++) {
      const idx = y * winW + x;
      if (binary[idx] === 1 && visited[idx] === 0) {
        // Start new component flood fill
        const compPoints: Point[] = [];
        const queue: number[] = [idx];
        visited[idx] = 1;

        let head = 0;
        while (head < queue.length) {
          const currIdx = queue[head++];
          const cx = currIdx % winW;
          const cy = Math.floor(currIdx / winW);
          compPoints.push({ x: cx, y: cy });

          // 4-Connectivity neighbors
          const neighbors = [
            { x: cx - 1, y: cy },
            { x: cx + 1, y: cy },
            { x: cx, y: cy - 1 },
            { x: cx, y: cy + 1 }
          ];

          for (const n of neighbors) {
            if (n.x >= 0 && n.x < winW && n.y >= 0 && n.y < winH) {
              const nIdx = n.y * winW + n.x;
              if (binary[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push(nIdx);
              }
            }
          }
        }

        // Component filtering: lowered noise threshold from 25 to 12 pixels
        if (compPoints.length > 12) {
          const xs = compPoints.map(p => p.x);
          const ys = compPoints.map(p => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const w = maxX - minX + 1;
          const h = maxY - minY + 1;

          components.push({
            points: compPoints,
            width: w,
            height: h,
            area: compPoints.length
          });
        }
      }
    }
  }

  // Filter candidates that resemble a solid square marker
  // Relaxed: aspect 0.4 to 2.5, solidity >= 0.35, size 6 to 120
  const markerCandidates = components.filter(c => {
    const aspect = c.width / c.height;
    const boxArea = c.width * c.height;
    const solidity = c.area / boxArea;
    return aspect >= 0.4 && aspect <= 2.5 && solidity >= 0.35 && c.width >= 6 && c.width <= 120;
  });

  if (markerCandidates.length === 0) return null;

  // Sort by area descending to find the largest marker-like component
  markerCandidates.sort((a, b) => b.area - a.area);

  // Among top candidates, prefer those closest to center with good squareness
  const centerWinX = winW / 2;
  const centerWinY = winH / 2;
  let bestCandidate = markerCandidates[0];
  let bestScore = -Infinity;

  for (const c of markerCandidates) {
    const xs = c.points.map(p => p.x);
    const ys = c.points.map(p => p.y);
    const cx = xs.reduce((a, b) => a + b, 0) / c.points.length;
    const cy = ys.reduce((a, b) => a + b, 0) / c.points.length;
    const dist = Math.sqrt((cx - centerWinX) ** 2 + (cy - centerWinY) ** 2);
    
    // Scoring: bigger area is better, closer to center is better, squareness bonus
    const aspect = c.width / c.height;
    const squareness = 1 - Math.abs(1 - aspect);
    const solidity = c.area / (c.width * c.height);
    const score = c.area * 2 + squareness * 100 + solidity * 50 - dist * 3;
    
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = c;
    }
  }

  // Calculate final centroid in global coordinates
  const finalXs = bestCandidate.points.map(p => p.x);
  const finalYs = bestCandidate.points.map(p => p.y);
  const localCentroidX = finalXs.reduce((a, b) => a + b, 0) / bestCandidate.points.length;
  const localCentroidY = finalYs.reduce((a, b) => a + b, 0) / bestCandidate.points.length;

  return {
    x: xMin + localCentroidX,
    y: yMin + localCentroidY
  };
}

/**
 * Full-frame marker scan: searches the entire canvas for 4 corner markers.
 * Divides the frame into quadrants and finds the best square marker in each.
 * This is a fallback for when the user doesn't perfectly align the sheet.
 */
export function findAllMarkersFullFrame(
  ctx: CanvasRenderingContext2D
): { tl: Point | null; tr: Point | null; bl: Point | null; br: Point | null } {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  
  // Search each quadrant with generous overlap
  const quarterW = cw * 0.4;
  const quarterH = ch * 0.4;
  
  const tl = findMarkerCentroid(ctx, quarterW / 2, quarterH / 2, Math.max(quarterW, quarterH) / 2);
  const tr = findMarkerCentroid(ctx, cw - quarterW / 2, quarterH / 2, Math.max(quarterW, quarterH) / 2);
  const bl = findMarkerCentroid(ctx, quarterW / 2, ch - quarterH / 2, Math.max(quarterW, quarterH) / 2);
  const br = findMarkerCentroid(ctx, cw - quarterW / 2, ch - quarterH / 2, Math.max(quarterW, quarterH) / 2);
  
  return { tl, tr, bl, br };
}

/**
 * Performs a perspective-correct bilinear warp on a source canvas using 4 corner points
 * onto a destination canvas of size 646 x 903.
 */
export function warpQuadrilateral(
  sourceCtx: CanvasRenderingContext2D,
  srcCorners: [Point, Point, Point, Point], // TL, TR, BL, BR
  destCanvas: HTMLCanvasElement
) {
  const destCtx = destCanvas.getContext('2d')!;
  const dw = destCanvas.width;
  const dh = destCanvas.height;

  const destImgData = destCtx.createImageData(dw, dh);
  const sw = sourceCtx.canvas.width;
  const sh = sourceCtx.canvas.height;
  const srcImgData = sourceCtx.getImageData(0, 0, sw, sh);
  const srcData = srcImgData.data;

  const [pTL, pTR, pBL, pBR] = srcCorners;

  for (let y = 0; y < dh; y++) {
    // Map y in the destination template [0, 903] to the vertical range [55.0, 884.5]
    // where 55.0 is the top marker Y and 884.5 is the bottom marker Y in the template.
    const v = (y - 55.0) / 829.5;
    const oneMinusV = 1 - v;
    
    // Account for slight shift/rotation by interpolating the X-bounds at this Y
    const xRight = 628.0 + v * 0.1;
    const xRange = xRight - 17.0;

    for (let x = 0; x < dw; x++) {
      // Map x in the destination template [0, 646] to the horizontal range [17.0, xRight]
      // where 17.0 is the left marker X and xRight is the interpolated right marker X.
      const u = (x - 17.0) / xRange;
      const oneMinusU = 1 - u;

      // Bilinear interpolation weights
      const wTL = oneMinusU * oneMinusV;
      const wTR = u * oneMinusV;
      const wBL = oneMinusU * v;
      const wBR = u * v;

      // Source pixel coordinate
      const sx = Math.round(wTL * pTL.x + wTR * pTR.x + wBL * pBL.x + wBR * pBR.x);
      const sy = Math.round(wTL * pTL.y + wTR * pTR.y + wBL * pBL.y + wBR * pBR.y);

      if (sx >= 0 && sx < sw && sy >= 0 && sy < sh) {
        const destIdx = (y * dw + x) * 4;
        const srcIdx = (sy * sw + sx) * 4;

        destImgData.data[destIdx] = srcData[srcIdx];
        destImgData.data[destIdx + 1] = srcData[srcIdx + 1];
        destImgData.data[destIdx + 2] = srcData[srcIdx + 2];
        destImgData.data[destIdx + 3] = srcData[srcIdx + 3];
      }
    }
  }
  destCtx.putImageData(destImgData, 0, 0);
}

/**
 * Computes average pixel darkness (255 - average grayscale) within a circle radius.
 */
export function readBubbleDarkness(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
): number {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const xMin = Math.max(0, Math.floor(cx - radius));
  const xMax = Math.min(w - 1, Math.ceil(cx + radius));
  const yMin = Math.max(0, Math.floor(cy - radius));
  const yMax = Math.min(h - 1, Math.ceil(cy + radius));

  const winW = xMax - xMin + 1;
  const winH = yMax - yMin + 1;

  if (winW <= 0 || winH <= 0) return 0;

  const imgData = ctx.getImageData(xMin, yMin, winW, winH);
  const data = imgData.data;

  let totalIntensity = 0;
  let pixelCount = 0;

  for (let y = 0; y < winH; y++) {
    const py = yMin + y;
    const dy = py - cy;
    for (let x = 0; x < winW; x++) {
      const px = xMin + x;
      const dx = px - cx;

      if (dx * dx + dy * dy <= radius * radius) {
        const idx = (y * winW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
        totalIntensity += grayscale;
        pixelCount++;
      }
    }
  }

  if (pixelCount === 0) return 0;
  const avgGrayscale = totalIntensity / pixelCount;
  // Convert grayscale to darkness: 0 (pure white) to 255 (pure black)
  return Math.max(0, 255 - avgGrayscale);
}

/**
 * Analyzes the standardized 646 x 903 warped OMR canvas to extract answers and Student ID digits.
 */
/**
 * Helper to get the grayscale values of pixels inside a circle.
 */
function getGrayscalePixelsInCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
): number[] {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const xMin = Math.max(0, Math.floor(cx - radius));
  const xMax = Math.min(w - 1, Math.ceil(cx + radius));
  const yMin = Math.max(0, Math.floor(cy - radius));
  const yMax = Math.min(h - 1, Math.ceil(cy + radius));

  const winW = xMax - xMin + 1;
  const winH = yMax - yMin + 1;

  if (winW <= 0 || winH <= 0) return [];

  const imgData = ctx.getImageData(xMin, yMin, winW, winH);
  const data = imgData.data;
  const pixels: number[] = [];

  for (let y = 0; y < winH; y++) {
    const py = yMin + y;
    const dy = py - cy;
    for (let x = 0; x < winW; x++) {
      const px = xMin + x;
      const dx = px - cx;

      if (dx * dx + dy * dy <= radius * radius) {
        const idx = (y * winW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
        pixels.push(grayscale);
      }
    }
  }
  return pixels;
}

/**
 * Analyzes the standardized 646 x 903 warped OMR canvas to extract answers and Student ID digits.
 * Uses local, row/column-level adaptive binarization and density counting for industrial-grade robustness.
 */
export function parseOMRSheet(canvas: HTMLCanvasElement): OMRParsedResult {
  const ctx = canvas.getContext('2d')!;
  const options = ['A', 'B', 'C', 'D'];
  const answers: string[] = Array(15).fill('');

  // 1. Parse Questions 1-13 (Left Column)
  for (let row = 0; row < 13; row++) {
    const cy = QUESTIONS_LEFT_Y_START + row * QUESTIONS_LEFT_Y_STEP;
    const rowPixels: number[] = [];
    const colPixelsList: number[][] = [];

    // Collect pixels around all 4 bubbles in this row to build an adaptive local threshold
    for (let col = 0; col < 4; col++) {
      const cx = QUESTIONS_LEFT_X[col];
      const pixels = getGrayscalePixelsInCircle(ctx, cx, cy, 8.5); // sample wider area
      colPixelsList.push(pixels);
      rowPixels.push(...pixels);
    }

    let minVal = 255;
    let maxVal = 0;
    for (const val of rowPixels) {
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    const contrast = maxVal - minVal;
    const localThreshold = minVal + 0.45 * contrast;
    const bubbleDensities: number[] = [];

    // Calculate binary filled density inside a tighter inner radius (6px) to avoid borders
    for (let col = 0; col < 4; col++) {
      const cx = QUESTIONS_LEFT_X[col];
      const innerPixels = getGrayscalePixelsInCircle(ctx, cx, cy, 6.0);
      
      let blackCount = 0;
      for (const val of innerPixels) {
        if (val < localThreshold) {
          blackCount++;
        }
      }
      const density = innerPixels.length > 0 ? blackCount / innerPixels.length : 0;
      bubbleDensities.push(density);
    }

    let maxIdx = 0;
    let maxDensity = -1;
    for (let col = 0; col < 4; col++) {
      if (bubbleDensities[col] > maxDensity) {
        maxDensity = bubbleDensities[col];
        maxIdx = col;
      }
    }

    const sumOthers = bubbleDensities.reduce((a, b) => a + b, 0) - maxDensity;
    const avgOthers = sumOthers / 3;
    const margin = maxDensity - avgOthers;

    if (contrast > 25 && maxDensity > 0.30 && margin > 0.15) {
      answers[row] = options[maxIdx];
    } else {
      answers[row] = '';
    }
  }

  // 2. Parse Questions 14-15 (Right Column)
  for (let row = 0; row < 2; row++) {
    const cy = QUESTIONS_RIGHT_Y_START + row * QUESTIONS_RIGHT_Y_STEP;
    const rowPixels: number[] = [];
    const colPixelsList: number[][] = [];

    for (let col = 0; col < 4; col++) {
      const cx = QUESTIONS_RIGHT_X[col];
      const pixels = getGrayscalePixelsInCircle(ctx, cx, cy, 8.5);
      colPixelsList.push(pixels);
      rowPixels.push(...pixels);
    }

    let minVal = 255;
    let maxVal = 0;
    for (const val of rowPixels) {
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    const contrast = maxVal - minVal;
    const localThreshold = minVal + 0.45 * contrast;
    const bubbleDensities: number[] = [];

    for (let col = 0; col < 4; col++) {
      const cx = QUESTIONS_RIGHT_X[col];
      const innerPixels = getGrayscalePixelsInCircle(ctx, cx, cy, 6.0);
      
      let blackCount = 0;
      for (const val of innerPixels) {
        if (val < localThreshold) {
          blackCount++;
        }
      }
      const density = innerPixels.length > 0 ? blackCount / innerPixels.length : 0;
      bubbleDensities.push(density);
    }

    let maxIdx = 0;
    let maxDensity = -1;
    for (let col = 0; col < 4; col++) {
      if (bubbleDensities[col] > maxDensity) {
        maxDensity = bubbleDensities[col];
        maxIdx = col;
      }
    }

    const sumOthers = bubbleDensities.reduce((a, b) => a + b, 0) - maxDensity;
    const avgOthers = sumOthers / 3;
    const margin = maxDensity - avgOthers;

    if (contrast > 25 && maxDensity > 0.30 && margin > 0.15) {
      answers[13 + row] = options[maxIdx];
    } else {
      answers[13 + row] = '';
    }
  }

  // 3. Parse Student ID (3 columns of digits 0 to 9)
  let studentIdCode = '';
  for (let col = 0; col < 3; col++) {
    const cx = STUDENT_ID_X[col];
    const colPixels: number[] = [];

    for (let row = 0; row < 10; row++) {
      const cy = STUDENT_ID_Y_START + row * STUDENT_ID_Y_STEP;
      const pixels = getGrayscalePixelsInCircle(ctx, cx, cy, 7.0);
      colPixels.push(...pixels);
    }

    let minVal = 255;
    let maxVal = 0;
    for (const val of colPixels) {
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    const contrast = maxVal - minVal;
    const localThreshold = minVal + 0.45 * contrast;
    
    let maxIdx = 0;
    let maxDensity = -1;

    for (let row = 0; row < 10; row++) {
      const cy = STUDENT_ID_Y_START + row * STUDENT_ID_Y_STEP;
      const innerPixels = getGrayscalePixelsInCircle(ctx, cx, cy, 4.5); // ID bubbles are smaller (4.5px inner)
      
      let blackCount = 0;
      for (const val of innerPixels) {
        if (val < localThreshold) {
          blackCount++;
        }
      }
      const density = innerPixels.length > 0 ? blackCount / innerPixels.length : 0;
      if (density > maxDensity) {
        maxDensity = density;
        maxIdx = row;
      }
    }

    if (contrast > 25 && maxDensity > 0.25) {
      studentIdCode += maxIdx.toString();
    } else {
      studentIdCode += '0';
    }
  }

  return {
    studentIdCode,
    answers
  };
}
