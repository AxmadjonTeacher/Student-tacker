// Headless runner for the OMR round-trip self-test (omr_roundtrip.html).
// Usage: start `npm run dev`, then `node scripts/omr_roundtrip.cjs [port]`.
const puppeteer = require('puppeteer');

(async () => {
  const port = process.argv[2] || '5173';
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1100 });
    await page.goto(`http://localhost:${port}/omr_roundtrip.html`, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__RT_RESULTS', { timeout: 30000 });
    const results = await page.evaluate(() => window.__RT_RESULTS);
    console.log(JSON.stringify(results, null, 2));
    await page.screenshot({ path: '/tmp/omr_roundtrip.png', fullPage: true });
    const ok = results.every(r => r.answersOk && r.idOk);
    console.log(ok ? 'ROUNDTRIP: PASS' : 'ROUNDTRIP: FAIL');
    process.exitCode = ok ? 0 : 1;
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
