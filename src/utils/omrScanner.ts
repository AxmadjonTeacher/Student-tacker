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

import omrCoordinates from './omr_coordinates.json';

// Fixed coordinates in the standardized 750 x 1000 warped template
export const TEMPLATE_WIDTH = 750;
export const TEMPLATE_HEIGHT = 1000;

// Centroids of the 4 outer corner fiducial markers in the template
export const TEMPLATE_TL: Point = omrCoordinates.template.markers.TL;
export const TEMPLATE_TR: Point = omrCoordinates.template.markers.TR;
export const TEMPLATE_BL: Point = omrCoordinates.template.markers.BL;
export const TEMPLATE_BR: Point = omrCoordinates.template.markers.BR;

// Coordinate Maps
export const BUBBLE_RADIUS = omrCoordinates.template.bubbleRadius; // radius for darkness check

// Left column questions (1 to 13)
export const QUESTIONS_LEFT_X = [161, 210, 259, 308]; // A, B, C, D
export const QUESTIONS_LEFT_Y_START = 154;
export const QUESTIONS_LEFT_Y_STEP = 63.24;

// Right column questions (14 to 15)
export const QUESTIONS_RIGHT_X = [408, 457, 506, 555]; // A, B, C, D
export const QUESTIONS_RIGHT_Y_START = 154;
export const QUESTIONS_RIGHT_Y_STEP = 63.24;

// Student ID Grid (3 columns of digits 0 to 9)
export const STUDENT_ID_X = [548, 597, 646]; // Digit Columns 1, 2, 3
export const STUDENT_ID_Y_START = 431;
export const STUDENT_ID_Y_STEP = 46.5;

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

  // Contrast check: must be high enough to represent a printed black marker on white paper
  if (maxVal - minVal < 45) {
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

        // Component filtering: raised noise threshold to 15 pixels to reject tiny dots
        if (compPoints.length > 15) {
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
  // Enforce strict aspect ratio, high solidity, minimum size, and absolute darkness
  const markerCandidates = components.filter(c => {
    const aspect = c.width / c.height;
    const boxArea = c.width * c.height;
    const solidity = c.area / boxArea;
    
    // Geometric checks: must be close to a square and highly solid
    if (aspect < 0.70 || aspect > 1.43 || solidity < 0.70 || c.width < 12 || c.width > 120) {
      return false;
    }

    // Absolute darkness check: average grayscale intensity of candidate pixels must be low (black)
    const compGraySum = c.points.reduce((acc, p) => acc + gray[p.y * winW + p.x], 0);
    const avgGray = compGraySum / c.points.length;
    if (avgGray > 110) {
      return false;
    }

    return true;
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
 * onto a destination canvas of size 750 x 1000.
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
    // Map y in the destination template [0, 1000] to the vertical range [35.0, 965.0]
    // where 35.0 is the top marker Y and 965.0 is the bottom marker Y.
    const v = (y - 35.0) / 930.0;
    const oneMinusV = 1 - v;
    
    // Account for slight shift/rotation by interpolating the X-bounds at this Y
    const xRight = 715.0; // TR and BR centers are at X=715
    const xRange = xRight - 35.0;

    for (let x = 0; x < dw; x++) {
      // Map x in the destination template [0, 750] to the horizontal range [35.0, xRight]
      // where 35.0 is the left marker X and xRight is the right marker X.
      const u = (x - 35.0) / xRange;
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

// ── Question layouts ─────────────────────────────────────────────────────────
// Bubble coordinates per question live in omr_coordinates.json (`questions`),
// and `layouts` maps a question count to the indices of that array to grade.
// Adding 20/30-question sheet support = adding their coordinate entries +
// a "20"/"30" layout key to the JSON. No code changes needed.

interface OMRQuestionEntry {
  q: number;
  column: string;
  options: Record<string, number[]>;
}

const QUESTION_ENTRIES = omrCoordinates.questions as OMRQuestionEntry[];
const LAYOUTS = (omrCoordinates as unknown as { layouts: Record<string, { questionIndices: number[] }> }).layouts;

/** Question counts the scanner can physically grade (layout data exists). */
export const SUPPORTED_SCAN_COUNTS: number[] = Object.keys(LAYOUTS || {}).map(Number);

/** Question counts selectable when creating a test (20/30 scan when layouts arrive). */
export const SELECTABLE_QUESTION_COUNTS: number[] = [10, 15, 20, 30];

/** Resolves the bubble-coordinate entries for a question count, or null if unsupported. */
export function getOMRLayout(questionCount: number): OMRQuestionEntry[] | null {
  const layout = LAYOUTS?.[questionCount.toString()];
  if (!layout) return null;
  const entries = layout.questionIndices
    .map(i => QUESTION_ENTRIES[i])
    .filter((e): e is OMRQuestionEntry => Boolean(e));
  return entries.length === layout.questionIndices.length ? entries : null;
}

/**
 * Detects which of the A-D bubbles in one question row is filled, using a
 * row-level adaptive threshold and inner-circle density counting.
 * Returns the option letter or '' when no confident mark exists.
 */
function detectMarkedOption(
  ctx: CanvasRenderingContext2D,
  centers: Array<[number, number]>,
  outerRadius: number,
  innerRadius: number
): string {
  const options = ['A', 'B', 'C', 'D'];
  const rowPixels: number[] = [];

  // Collect pixels around all bubbles in this row to build an adaptive local threshold
  for (const [cx, cy] of centers) {
    rowPixels.push(...getGrayscalePixelsInCircle(ctx, cx, cy, outerRadius));
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

  // Calculate binary filled density inside a tighter inner radius to avoid borders
  for (const [cx, cy] of centers) {
    const innerPixels = getGrayscalePixelsInCircle(ctx, cx, cy, innerRadius);

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
  for (let col = 0; col < bubbleDensities.length; col++) {
    if (bubbleDensities[col] > maxDensity) {
      maxDensity = bubbleDensities[col];
      maxIdx = col;
    }
  }

  const sumOthers = bubbleDensities.reduce((a, b) => a + b, 0) - maxDensity;
  const avgOthers = sumOthers / Math.max(1, bubbleDensities.length - 1);
  const margin = maxDensity - avgOthers;

  if (contrast > 25 && maxDensity > 0.30 && margin > 0.15) {
    return options[maxIdx];
  }
  return '';
}

/**
 * Analyzes the standardized 646 x 903 warped OMR canvas to extract answers and Student ID digits.
 * Uses local, row/column-level adaptive binarization and density counting for industrial-grade robustness.
 */
export function parseOMRSheet(canvas: HTMLCanvasElement, questionCount: number = 15): OMRParsedResult {
  const ctx = canvas.getContext('2d')!;

  const outerRadius = omrCoordinates.template.sampling.outerWindowRadius;
  const innerQRadius = omrCoordinates.template.sampling.innerQuestionRadius;
  const innerIdRadius = omrCoordinates.template.sampling.innerIdRadius;

  // 1. Parse questions via the coordinate layout for this question count
  const layout = getOMRLayout(questionCount) || getOMRLayout(15)!;
  const answers: string[] = Array(layout.length).fill('');

  layout.forEach((entry, idx) => {
    const centers: Array<[number, number]> = ['A', 'B', 'C', 'D'].map(opt => {
      const [cx, cy] = entry.options[opt];
      return [cx, cy] as [number, number];
    });
    answers[idx] = detectMarkedOption(ctx, centers, outerRadius, innerQRadius);
  });

  // 3. Parse Student ID (3 columns of digits 0 to 9)
  let studentIdCode = '';
  for (let col = 0; col < 3; col++) {
    const cx = STUDENT_ID_X[col];
    const colPixels: number[] = [];

    for (let row = 0; row < 10; row++) {
      const cy = STUDENT_ID_Y_START + row * STUDENT_ID_Y_STEP;
      const pixels = getGrayscalePixelsInCircle(ctx, cx, cy, outerRadius - 1.5);
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
      const innerPixels = getGrayscalePixelsInCircle(ctx, cx, cy, innerIdRadius);
      
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
      // Unreadable/unshaded digit: '?' (never collides with a real code and
      // fails the BR/AL ### auto-match, forcing manual student selection)
      studentIdCode += '?';
    }
  }

  return {
    studentIdCode,
    answers
  };
}
