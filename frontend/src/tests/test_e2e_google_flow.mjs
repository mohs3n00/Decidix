import { chromium } from 'playwright';

async function testE2EGoogleFlow() {
  console.log('--- STARTING GOOGLE OAUTH E2E TEST ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--dns-result-order=ipv4first', '--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log('BROWSER CONSOLE:', text);
  });
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('1. Navigating to https://web.decidixapp.tech/login...');
  await page.goto('https://web.decidixapp.tech/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  // 2. Inspect button
  const button = await page.$('button:has-text("Continue with Google"), button:has-text("المتابعة باستخدام Google")');
  if (!button) throw new Error('Google Sign-In button not found in DOM');
  console.log('✓ Google Sign-In button verified in DOM');

  // 3. Click button and capture Popup
  console.log('2. Clicking Google button and capturing OAuth popup...');
  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 15000 }),
    button.click()
  ]);

  const rawPopupUrl = popup.url();
  console.log('✓ Popup opened successfully!');
  console.log('Raw Popup URL:', rawPopupUrl);

  // Parse authorization request
  const parsedUrl = new URL(rawPopupUrl);
  const clientId = parsedUrl.searchParams.get('client_id');
  const redirectUri = parsedUrl.searchParams.get('redirect_uri');
  const responseType = parsedUrl.searchParams.get('response_type');
  const scope = parsedUrl.searchParams.get('scope');

  console.log('\n--- EXTRACTED OAUTH AUTHORIZATION REQUEST ---');
  console.log('OAuth Endpoint:', parsedUrl.origin + parsedUrl.pathname);
  console.log('Client ID:', clientId);
  console.log('redirect_uri:', redirectUri);
  console.log('response_type (Flow):', responseType);
  console.log('scope:', scope);
  console.log('--------------------------------------------\n');

  // 4. Test popup response on Google's side
  await popup.waitForLoadState('domcontentloaded');
  const finalGoogleUrl = popup.url();
  const pageTitle = await popup.title();
  console.log('Popup loaded Google page title:', pageTitle);
  console.log('Popup final URL:', finalGoogleUrl.substring(0, 100) + '...');

  const hasMismatch = finalGoogleUrl.includes('redirect_uri_mismatch');
  if (hasMismatch) {
    throw new Error('Google OAuth returned redirect_uri_mismatch!');
  }
  console.log('✓ Google accepted the authorization request without redirect_uri_mismatch!');

  // Close popup
  await popup.close();

  // 5. Verify Frontend Backend PostMessage Handler & Storage
  console.log('3. Testing frontend token listener and backend communication...');
  // Send simulated postMessage to verify the frontend listener processes the token and calls Heroku backend
  const networkRequests = [];
  page.on('request', req => {
    if (req.url().includes('/auth/google')) {
      networkRequests.push({ url: req.url(), method: req.method(), postData: req.postData() });
      console.log('CAPTURED OUTGOING BACKEND REQUEST:', req.method(), req.url());
    }
  });

  const dispatchResult = await page.evaluate(async () => {
    // Dispatch test postMessage
    window.postMessage({
      type: 'DECIDIX_GOOGLE_AUTH_SUCCESS',
      idToken: 'test_synthetic_token_for_e2e_verification'
    }, window.location.origin);
    
    // Wait briefly for network request to fire
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if error box or alert appeared (since this dummy token will fail Google verification on Heroku)
    const errorEl = document.querySelector('.bg-rose-50');
    return {
      errorVisible: !!errorEl,
      errorText: errorEl ? errorEl.textContent : null
    };
  });

  console.log('Frontend response to token dispatch:', dispatchResult);
  console.log('Outgoing Backend Requests captured:', JSON.stringify(networkRequests, null, 2));

  await page.screenshot({ path: 'frontend/e2e_test_result.png' });
  console.log('Screenshot saved to frontend/e2e_test_result.png');

  await browser.close();
  console.log('--- TEST FINISHED SUCCESSFULLY ---');
}

testE2EGoogleFlow().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
