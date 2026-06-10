import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Capture console messages
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER ERROR] ${err.toString()}`);
  });

  try {
    console.log('Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    console.log('Waiting 5 seconds for service worker registration/reload to settle...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Logging in as adminall...');
    await page.waitForSelector('#student-id', { timeout: 5000 });
    await page.type('#student-id', 'adminall');
    await page.type('#current-password', 'Azz21adminall');
    await page.click('button[type="submit"]');

    console.log('Waiting for Dashboard page load...');
    await page.waitForSelector('.top3-grid', { timeout: 10000 });

    console.log('Navigating to subject tab to open StudentTable...');
    // Click on the sidebar subject tab (like 'Ingliz tili' / 'Boshlang\'ich')
    await page.waitForSelector('aside button', { timeout: 5000 });
    const buttons = await page.$$('aside button');
    console.log(`Found ${buttons.length} buttons in sidebar`);
    for (let i = 0; i < buttons.length; i++) {
      const title = await page.evaluate(el => el.title || el.textContent, buttons[i]);
      console.log(`Sidebar Button ${i}: ${title}`);
    }

    // Button 3 is usually 'Boshlang\'ich'
    if (buttons.length > 3) {
      console.log('Clicking on subject button...');
      await buttons[3].click();
    } else {
      console.log('Not enough buttons found, clicking the second button');
      await buttons[1].click();
    }

    console.log('Waiting for StudentTable to render...');
    await page.waitForSelector('.chart-cell', { timeout: 10000 });

    console.log('Clicking on a student chart-cell to open GraphModal...');
    const chartCells = await page.$$('.chart-cell');
    if (chartCells.length > 0) {
      await chartCells[0].click();
    } else {
      throw new Error('No chart cells found');
    }

    console.log('Waiting for GraphModal to open...');
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });

    console.log('Checking modal tabs...');
    const modalTabs = await page.$$('.modal-tabs button');
    console.log(`Found ${modalTabs.length} modal tabs`);
    for (let i = 0; i < modalTabs.length; i++) {
      const text = await page.evaluate(el => el.textContent, modalTabs[i]);
      console.log(`Tab ${i}: ${text}`);
      if (text.includes("HAFTALIK O'ZGARISH")) {
        console.log(`Clicking Tab ${i} ("HAFTALIK O'ZGARISH")...`);
        await modalTabs[i].click();
        break;
      }
    }

    // Wait a bit to let it render and capture any errors
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Finished capturing logs.');
  } catch (error) {
    console.error('An error occurred during execution:', error);
  } finally {
    await browser.close();
  }
})();
