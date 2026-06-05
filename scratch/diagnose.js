import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message, err.stack));

  // Bypass login screen and mock serviceWorker safely
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('auth_role', 'admin');
    localStorage.setItem('admin_passcode', 'Azz21adminall');
    Object.defineProperty(navigator, 'serviceWorker', {
      get() {
        return {
          register: () => Promise.resolve({}),
          addEventListener: () => {},
          removeEventListener: () => {},
        };
      }
    });
  });

  console.log('Navigating to http://localhost:5173/...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  console.log('Waiting for data loader to disappear...');
  await page.waitForFunction(() => !document.body.innerText.includes("Ma'lumotlar yuklanmoqda"));

  console.log('Page loaded. Dismissing PWA modal if present...');
  await page.evaluate(() => {
    const closeSvg = document.querySelector('button svg');
    if (closeSvg) {
      const button = closeSvg.closest('button');
      if (button) {
        button.click();
        console.log('Clicked PWA close button');
      }
    }
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('Clicking "Grant testlar" tab in sidebar...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('div, span, p, a, li'));
    const grantTab = tabs.find(el => el.innerText && el.innerText.trim() === 'Grant testlar');
    if (grantTab) {
      grantTab.click();
      console.log('Clicked Grant testlar tab element');
    } else {
      console.log('Grant testlar tab element NOT found');
    }
  });

  await new Promise(resolve => setTimeout(resolve, 1500));
  await page.screenshot({ path: '/Users/ahmetyadgarov/.gemini/antigravity/brain/bba63d88-f4d6-4266-9a1c-d8de4a34e802/screenshot_grant_page.png' });
  console.log('Screenshot of Grant Tests page saved.');

  console.log('Clicking "Grafikni ko\'rish" button on Grant page...');
  const clickGraphResult = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const graphBtn = btns.find(b => b.innerText && b.innerText.includes("Grafikni ko'rish"));
    if (graphBtn) {
      graphBtn.click();
      return 'Clicked "Grafikni ko\'rish" button';
    }
    return 'Could not find "Grafikni ko\'rish" button';
  });
  console.log('Click Graph Result:', clickGraphResult);

  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: '/Users/ahmetyadgarov/.gemini/antigravity/brain/bba63d88-f4d6-4266-9a1c-d8de4a34e802/screenshot_grant_modal.png' });
  console.log('Screenshot of Grant modal saved.');

  // Now, let's try Haftalik Tahlil tab
  console.log('Clicking "Haftalik tahlil" tab in sidebar...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('div, span, p, a, li'));
    const tahlilTab = tabs.find(el => el.innerText && el.innerText.trim() === 'Haftalik tahlil');
    if (tahlilTab) {
      tahlilTab.click();
      console.log('Clicked Haftalik tahlil tab');
    } else {
      console.log('Haftalik tahlil tab NOT found');
    }
  });

  await new Promise(resolve => setTimeout(resolve, 1500));
  await page.screenshot({ path: '/Users/ahmetyadgarov/.gemini/antigravity/brain/bba63d88-f4d6-4266-9a1c-d8de4a34e802/screenshot_tahlil_page.png' });

  console.log('Clicking chart cell in Haftalik Tahlil table...');
  const clickCellResult = await page.evaluate(() => {
    const cell = document.querySelector('.chart-cell');
    if (cell) {
      cell.click();
      return 'Clicked .chart-cell';
    }
    return 'Could not find .chart-cell';
  });
  console.log('Click Cell Result:', clickCellResult);

  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: '/Users/ahmetyadgarov/.gemini/antigravity/brain/bba63d88-f4d6-4266-9a1c-d8de4a34e802/screenshot_tahlil_modal.png' });
  console.log('Screenshot of Haftalik Tahlil modal saved.');

  await browser.close();
})();
