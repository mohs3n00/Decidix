import { chromium } from 'playwright';

async function testOAuthAcceptedFlow() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--dns-result-order=ipv4first', '--no-sandbox']
  });

  const page = await browser.newPage();
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=50086376748-676lft8efht29skofqs9ouk3ic8nldue.apps.googleusercontent.com&redirect_uri=${encodeURIComponent('https://decidix-web-staging.20912023100049.workers.dev')}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=test_nonce_12345`;

  console.log('Navigating to Google OAuth URL with authorized redirect_uri:');
  console.log(authUrl);

  const response = await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('Final URL after Google redirects:', page.url());
  console.log('HTTP Status:', response.status());

  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);

  const pageContent = await page.content();
  const hasError = pageContent.includes('redirect_uri_mismatch');
  console.log('Contains redirect_uri_mismatch:', hasError);

  const isSignIn = page.url().includes('signin/identifier') || pageContent.includes('Sign in') || pageContent.includes('تسجيل الدخول');
  console.log('Is Google Sign-In Identifier Page:', isSignIn);

  await page.screenshot({ path: 'frontend/test-google-oauth-success-prompt.png' });
  console.log('Saved screenshot to frontend/test-google-oauth-success-prompt.png');

  await browser.close();
}

testOAuthAcceptedFlow().catch(console.error);
