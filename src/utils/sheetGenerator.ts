// Print-ready OMR answer sheet generator (10/15/20/30 questions).
//
// Geometry comes from omr_coordinates.json via getOMRLayout() — the same
// source the scanner reads — so generated sheets and the scanner can never
// drift apart. Visual conventions (40×40 corner squares centered on the
// marker centroids, black bold letters/digits inside bubbles, write-in boxes
// above the ID grid) replicate public/omr_sheet_template.svg, which the
// scanner's adaptive-threshold detection already handles in production.
//
// Sheets render at an integer scale of the 750×1000 template (default 4× =
// 3000×4000, ≈250 DPI on A4). Print size is irrelevant to the scanner: it
// warps from the corner markers, so only relative geometry matters.

import omrCoordinates from './omr_coordinates.json';
import { getOMRLayout } from './omrScanner';

const T = omrCoordinates.template;
const ID_BUBBLE_RADIUS = 10; // matches the original template's ID circles

export function renderAnswerSheetCanvas(questionCount: number, scale: number = 4): HTMLCanvasElement {
  const layout = getOMRLayout(questionCount);
  if (!layout) throw new Error(`Unsupported sheet layout: ${questionCount}`);

  const canvas = document.createElement('canvas');
  canvas.width = T.width * scale;
  canvas.height = T.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale); // draw everything in template units

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, T.width, T.height);

  // Corner fiducial markers: 40×40 squares centered on the marker centroids
  ctx.fillStyle = '#000000';
  for (const m of [T.markers.TL, T.markers.TR, T.markers.BL, T.markers.BR]) {
    ctx.fillRect(m.x - 20, m.y - 20, 40, 40);
  }

  // Name/signature box
  const sig = T.signatureBox;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(sig.x, sig.y, sig.width, sig.height);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Ism va familiya (To`rtburchak tashqarisiga yozmang)', sig.x + 10, sig.y - 8);

  // Title row under the signature box
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`JAVOBLAR VARAQASI — ${questionCount} SAVOL`, 98, 100);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Sinf: ________      Fan: ____________      Sana: ________', 98, 122);

  // Student ID grid (geometry is layout-specific: standard right-middle grid
  // for 10/15, compact top-right grid for 20/30)
  const idColumns = layout.studentId;
  const digitYs = (col: typeof idColumns[number]) =>
    Array.from({ length: 10 }, (_, d) => col.digits[d.toString()]);
  const firstY = Math.min(...idColumns.map(c => digitYs(c)[0]));
  const idStep = digitYs(idColumns[0])[1] - digitYs(idColumns[0])[0];
  const colSpacing = idColumns.length > 1 ? idColumns[1].x - idColumns[0].x : 49;
  const boxW = colSpacing;
  const boxH = Math.min(46.5, idStep + 14);
  const boxTop = firstY - ID_BUBBLE_RADIUS - 4 - boxH;

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('O`quvchi IDsi', idColumns[Math.floor(idColumns.length / 2)].x, boxTop - 8);

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#000000';
  for (const col of idColumns) {
    ctx.strokeRect(col.x - boxW / 2, boxTop, boxW, boxH);
  }

  ctx.lineWidth = 1;
  for (const col of idColumns) {
    const ys = digitYs(col);
    for (let digit = 0; digit < 10; digit++) {
      const cy = ys[digit];
      ctx.beginPath();
      ctx.arc(col.x, cy, ID_BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(digit.toString(), col.x, cy + 3.5);
    }
  }

  // Question grid
  const options = ['A', 'B', 'C', 'D'];
  // Tighter rows (20/30 right column) get smaller number labels
  const rowStep = layout.questions.length > 1
    ? Math.abs((layout.questions[1].options.A[1] ?? 0) - (layout.questions[0].options.A[1] ?? 0))
    : 63;
  const numberFont = rowStep < 40 ? 'bold 12px sans-serif' : 'bold 15px sans-serif';

  for (const entry of layout.questions) {
    const ax = entry.options.A[0];
    const cy = entry.options.A[1];

    ctx.fillStyle = '#000000';
    ctx.font = numberFont;
    ctx.textAlign = 'right';
    ctx.fillText(entry.q.toString(), ax - T.bubbleRadius - 14, cy + 5);

    ctx.textAlign = 'center';
    for (const opt of options) {
      const [cx, ocy] = entry.options[opt];
      ctx.beginPath();
      ctx.arc(cx, ocy, T.bubbleRadius, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(opt, cx, ocy + 4);
    }
  }

  // Footer print hint, centered between the bottom markers
  ctx.fillStyle = '#475569';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("Chop etishda 100% masshtabdan foydalaning • Tanlangan doirani qoraytirib to`liq bo`yang", T.width / 2, 993);

  return canvas;
}

export function generateAnswerSheetPNG(questionCount: number, scale: number = 4): Promise<Blob> {
  const canvas = renderAnswerSheetCanvas(questionCount, scale);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('PNG rendering failed'));
    }, 'image/png');
  });
}

export async function downloadAnswerSheetPNG(questionCount: number): Promise<void> {
  const blob = await generateAnswerSheetPNG(questionCount);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${questionCount}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
