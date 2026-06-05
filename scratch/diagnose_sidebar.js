import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message, err.stack));

  // Bypass login screen
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

  console.log('Waiting for data loader...');
  await page.waitForFunction(() => !document.body.innerText.includes("Ma'lumotlar yuklanmoqda"));

  // Evaluate sidebar links
  const sidebarItems = await page.evaluate(() => {
    // Let's find all clickable items on the left side
    const elements = Array.from(document.querySelectorAll('div, li, button, a'));
    return elements.map((el, i) => {
      const text = el.innerText ? el.innerText.trim() : '';
      const className = el.className || '';
      return { index: i, tag: el.tagName, text, className };
    }).filter(item => item.text.length > 0 && item.text.length < 50);
  });
  console.log('Sidebar items:', sidebarItems);

  // Click on the PWA close button using its SVG
  await page.evaluate(() => {
    const pwaCloseBtn = Array.from(document.querySelectorAll('button')).find(b => {
      return b.innerHTML.includes('svg') && b.closest('[class*="modal"]') || b.closest('[class*="popup"]');
    });
    if (pwaCloseBtn) {
      pwaCloseBtn.click();
      console.log('Dismissed PWA modal');
    } else {
      // Find the first SVG element inside a button and click its parent button
      const svg = document.querySelector('svg');
      if (svg) {
        const button = svg.closest('button');
        if (button) {
          button.click();
          console.log('Clicked first button with SVG');
        }
      }
    }
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Click Grant Tests by matching text
  const grantClicked = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('*'));
    // Look for elements with tooltip/text or title
    const grantEl = list.find(el => {
      const text = el.innerText ? el.innerText.trim() : '';
      const title = el.getAttribute('title') || '';
      return text.includes('Grant testlar') || title.includes('Grant testlar');
    });
    if (grantEl) {
      grantEl.click();
      return 'Clicked Grant Tests: ' + grantEl.tagName;
    }
    // Alternatively, let's look for the 4th child of the sidebar container
    // Let's look at the sidebar menu list
    const sidebar = document.querySelector('aside, [class*="sidebar"], [class*="drawer"]');
    if (sidebar) {
      const items = Array.from(sidebar.querySelectorAll('li, div, button'));
      if (items[3]) {
        items[3].click();
        return 'Clicked 4th item in sidebar';
      }
    }
    return 'Could not click Grant Tests';
  });
  console.log('Grant Click Result:', grantClicked);

  await new Promise(resolve => setTimeout(resolve, 1500));
  await page.screenshot({ path: '/Users/ahmetyadgarov/.gemini/antigravity/brain/bba63d88-f4d6-4266-9a1c-d8de4a34e802/screenshot_grant_page_new.png' });

  // Click the graph button on the page
  const clickGraphBtn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Grafikni ko\'rish'));
    if (btn) {
      btn.click();
      return 'Clicked graph button';
    }
    return 'Graph button not found';
  });
  console.log('Click Graph Button Result:', clickGraphBtn);

  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: '/Users/ahmetyadgarov/.gemini/antigravity/brain/bba63d88-f4d6-4266-9a1c-d8de4a34e802/screenshot_grant_modal_new.png' });

  // Click Haftalik Tahlil by matching text
  const tahlilClicked = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('*'));
    const tahlilEl = list.find(el => {
      const text = el.innerText ? el.innerText.trim() : '';
      const title = el.getAttribute('title') || '';
      return text.includes('Haftalik tahlil') || title.includes('Haftalik tahlil');
    });
    if (tahlilEl) {
      tahlilEl.click();
      return 'Clicked Haftalik Tahlil: ' + tahlilEl.tagName;
    }
    return 'Could not click Haftalik Tahlil';
  });
  console.log('Tahlil Click Result:', tahlilClicked);

  await new Promise(resolve => setTimeout(resolve, 1500));
  await page.screenshot({ path: '/Users/ahmetyadgarov/.gemini/antigravity/brain/bba63d88-f4d6-4266-9a1c-d8de4a34e802/screenshot_tahlil_page_new.png' });

  // Click chart cell
  const clickCell = await page.evaluate(() => {
    const cell = document.querySelector('.chart-cell');
    if (cell) {
      cell.click();
      return 'Clicked chart cell';
    }
    return 'Chart cell not found';
  });
  console.log('Click Cell Result:', clickCell);

  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: '/Users/ahmetyadgarov/.gemini/antigravity/brain/bba63d88-f4d6-4266-9a1c-d8de4a34e802/screenshot_tahlil_modal_new.png' });

  await browser.close();
})();
