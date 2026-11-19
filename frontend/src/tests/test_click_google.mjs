import { chromium } from 'playwright';

async function testClick() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--dns-result-order=ipv4first', '--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to login page...');
  await page.goto('https://web.decidixapp.tech/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  // Check for button
  const button = await page.$('button:has-text("Continue with Google"), button:has-text("المتابعة باستخدام Google")');
  console.log('Found Google button:', !!button);

  // Listen for popup
  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 10000 }).catch(e => {
      console.log('No popup opened within 10s:', e.message);
      return null;
    }),
    button.click()
  ]);

  if (popup) {
    console.log('Popup opened! URL:', popup.url());
    await popup.waitForLoadState('domcontentloaded');
    console.log('Popup URL after load:', popup.url());
    const title = await popup.title();
    console.log('Popup Title:', title);
    await popup.screenshot({ path: 'frontend/popup_screenshot.png' });
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'frontend/after_click_screenshot.png' });

  await browser.close();
}

testClick().catch(console.error);
