import { chromium } from 'playwright';

async function testGis() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--dns-result-order=ipv4first', '--no-sandbox']
  });

  const page = await browser.newPage();
  
  // Listen to console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:5173/login...');
  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('Goto localhost failed or timed out:', e.message);
  }

  // Check if GIS is loaded
  const hasGis = await page.evaluate(() => {
    return !!window.google?.accounts?.id;
  });
  console.log('Is window.google.accounts.id loaded:', hasGis);

  // If not loaded, check if script tag is in DOM
  const scriptSrcs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean);
  });
  console.log('Scripts in page:', scriptSrcs);

  await browser.close();
}

testGis().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
