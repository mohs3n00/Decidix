import { chromium } from 'playwright';

async function screenshotLogin() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--dns-result-order=ipv4first', '--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('https://web.decidixapp.tech/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'frontend/current_login_screenshot.png' });
  console.log('Saved frontend/current_login_screenshot.png');
  await browser.close();
}

screenshotLogin().catch(console.error);
