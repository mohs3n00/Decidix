import { chromium } from 'playwright';

async function testFullSuccessFlow() {
  console.log('Testing full Google login session creation and navigation...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--dns-result-order=ipv4first', '--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Intercept the backend auth/google request to simulate successful verification and session issuance
  await page.route('**/v1/auth/google', async route => {
    console.log('Intercepted /v1/auth/google request:', route.request().postData());
    const mockAuthResponse = {
      status: 'success',
      data: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfdXNlcl8xMjM0NSIsImVtYWlsIjoidXNlckBkZWNpZGl4YXBwLnRlY2giLCJyb2xlIjoidmlld2VyIn0.test_sig',
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfdXNlcl8xMjM0NSIsImVtYWlsIjoidXNlckBkZWNpZGl4YXBwLnRlY2giLCJyb2xlIjoidmlld2VyIn0.test_sig',
        refresh_token: 'test_refresh_token_value_abc123',
        user: {
          id: 'google_user_12345',
          email: 'user@decidixapp.tech',
          name: 'Decidix Google Verified User',
          role: 'viewer',
          is_active: true,
          email_verified: true,
          created_at: new Date().toISOString()
        }
      }
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAuthResponse)
    });
    console.log('Fulfilled with 200 OK mock session response');
  });

  console.log('Navigating to https://web.decidixapp.tech/login...');
  await page.goto('https://web.decidixapp.tech/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  // Dispatch DECIDIX_GOOGLE_AUTH_SUCCESS message into window
  console.log('Dispatching DECIDIX_GOOGLE_AUTH_SUCCESS event into window...');
  await page.evaluate(() => {
    window.postMessage({
      type: 'DECIDIX_GOOGLE_AUTH_SUCCESS',
      idToken: 'valid_google_id_token_simulated'
    }, window.location.origin);
  });

  // Wait for navigation to /
  console.log('Waiting for URL navigation to / ...');
  await page.waitForURL('https://web.decidixapp.tech/', { timeout: 10000 });
  console.log('✓ Successfully navigated to:', page.url());

  // Check localStorage session
  const storage = await page.evaluate(() => {
    return {
      accessToken: localStorage.getItem('decidix_access_token'),
      refreshToken: localStorage.getItem('decidix_refresh_token'),
      user: localStorage.getItem('decidix_user')
    };
  });

  console.log('localStorage Session State:', JSON.stringify(storage, null, 2));

  if (!storage.accessToken || !storage.user) {
    throw new Error('Tokens or user missing from localStorage!');
  }
  console.log('✓ Session successfully established in localStorage!');

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'frontend/test-post-google-login-dashboard.png' });
  console.log('Screenshot of authenticated dashboard saved to frontend/test-post-google-login-dashboard.png');

  await browser.close();
  console.log('ALL VERIFICATIONS PASSED!');
}

testFullSuccessFlow().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
