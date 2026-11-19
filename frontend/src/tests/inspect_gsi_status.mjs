import { chromium } from 'playwright';

async function inspect() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  const responses = [];

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('google') || url.includes('gsi')) {
      responses.push({
        url: url.substring(0, 120),
        status: res.status(),
      });
    }
  });

  page.on('console', (msg) => {
    console.log('[BROWSER CONSOLE]', msg.type(), msg.text());
  });

  await page.goto('https://web.decidixapp.tech/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('\n--- Captured Google / GSI Traffic ---');
  responses.forEach(r => console.log(`${r.status} ${r.url}`));

  await browser.close();
}

inspect().catch(console.error);
