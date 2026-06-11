// Dev-only round-trip self-test: render each generated answer sheet, fill a
// known answer pattern + student ID directly on the canvas, then run the real
// scanner (parseOMRSheet) and compare. Open /omr_roundtrip.html under
// `npm run dev` to execute; results land in window.__RT_RESULTS and the DOM.

import { renderAnswerSheetCanvas } from './sheetGenerator';
import { parseOMRSheet, getOMRLayout, BUBBLE_RADIUS, SUPPORTED_SCAN_COUNTS } from './omrScanner';

interface RoundtripResult {
  count: number;
  answersOk: boolean;
  idOk: boolean;
  parsedId: string;
  parsedAnswers: string;
  expected: string;
}

async function run() {
  const results: RoundtripResult[] = [];
  const options = ['A', 'B', 'C', 'D'];

  for (const count of SUPPORTED_SCAN_COUNTS) {
    const layout = getOMRLayout(count);
    if (!layout) continue;

    // Scale 1 → 750×1000, the exact frame parseOMRSheet expects
    const canvas = renderAnswerSheetCanvas(count, 1);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1e293b';

    // Fill a deterministic A,B,C,D,A,... pattern
    const expected: string[] = [];
    layout.questions.forEach((entry, i) => {
      const opt = options[i % 4];
      expected.push(opt);
      const [cx, cy] = entry.options[opt];
      ctx.beginPath();
      ctx.arc(cx, cy, BUBBLE_RADIUS - 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Fill student ID 557
    const idDigits = ['5', '5', '7'];
    layout.studentId.forEach((col, i) => {
      const cy = col.digits[idDigits[i]];
      ctx.beginPath();
      ctx.arc(col.x, cy, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
      ctx.fill();
    });

    const parsed = parseOMRSheet(canvas, count);
    results.push({
      count,
      answersOk: parsed.answers.length === expected.length && parsed.answers.every((a, i) => a === expected[i]),
      idOk: parsed.studentIdCode === '557',
      parsedId: parsed.studentIdCode,
      parsedAnswers: parsed.answers.join(''),
      expected: expected.join('')
    });

    // Show the filled sheet for visual inspection
    canvas.style.width = '300px';
    canvas.style.border = '1px solid #94a3b8';
    canvas.style.margin = '8px';
    document.body.appendChild(canvas);
  }

  (window as unknown as { __RT_RESULTS: RoundtripResult[] }).__RT_RESULTS = results;
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(results, null, 2);
  document.body.prepend(pre);
}

run();
