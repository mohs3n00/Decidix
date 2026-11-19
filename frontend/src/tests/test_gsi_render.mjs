import { chromium } from 'playwright';

async function testRender() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--dns-result-order=ipv4first', '--no-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to https://web.decidixapp.tech/login...');
  await page.goto('https://web.decidixapp.tech/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('Navigated!');
  await page.waitForTimeout(2000);

  // Evaluate renderButton in the page
  const result = await page.evaluate(async (clientId) => {
    return new Promise((resolve) => {
      if (!window.google?.accounts?.id) {
        return resolve({ error: 'GIS script not loaded' });
      }

      const container = document.createElement('div');
      container.id = 'test-gsi-container';
      document.body.appendChild(container);

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => {
            console.log('GIS callback called with credential:', res.credential ? 'PRESENT' : 'NONE');
          }
        });

        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'continue_with',
          shape: 'pill'
        });

        setTimeout(() => {
          const iframe = container.querySelector('iframe');
          resolve({
            hasIframe: !!iframe,
            iframeSrc: iframe ? iframe.src : null,
            containerHtml: container.innerHTML.substring(0, 400)
          });
        }, 2000);
      } catch (e) {
        resolve({ error: e.message });
      }
    });
  }, '50086376748-676lft8efht29skofqs9ouk3ic8nldue.apps.googleusercontent.com');

  console.log('Render Result:', JSON.stringify(result, null, 2));
  await page.screenshot({ path: 'frontend/test-gsi-web-decidix.png' });
  await browser.close();
}

testRender().catch(console.error);
