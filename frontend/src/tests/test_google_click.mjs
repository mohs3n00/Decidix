import { chromium } from 'playwright';

async function testGoogleClick() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  const network = [];

  page.on('request', req => {
    if (req.url().includes('google') || req.url().includes('oauth') || req.url().includes('/auth/')) {
      network.push({ type: 'REQ', method: req.method(), url: req.url() });
    }
  });

  page.on('response', res => {
    if (res.url().includes('google') || res.url().includes('oauth') || res.url().includes('/auth/')) {
      network.push({ type: 'RES', status: res.status(), url: res.url() });
    }
  });

  page.on('popup', async popup => {
    console.log('[POPUP OPENED]:', popup.url());
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    console.log('[POPUP TITLE]:', await popup.title().catch(() => ''));
    console.log('[POPUP URL]:', popup.url());
  });

  await page.goto('https://web.decidixapp.tech/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const googleBtn = page.locator('button:has-text("Continue with Google"), button:has-text("Google")').first();
  console.log('Clicking Google button...');
  await googleBtn.click();
  await page.waitForTimeout(5000);

  console.log('\n--- Network Activity on Google Click ---');
  network.forEach(n => console.log(`${n.type} ${n.status || n.method} ${n.url.substring(0, 120)}`));

  await browser.close();
}

testGoogleClick().catch(console.error);
