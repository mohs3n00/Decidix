import { chromium } from 'playwright';

async function testGoogleSignInPage() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  const clientId = '50086376748-676lft8efht29skofqs9ouk3ic8nldue.apps.googleusercontent.com';
  const redirectUri = 'https://decidix-web-staging.20912023100049.workers.dev';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=123456`;

  await page.goto(authUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const title = await page.title();
  const url = page.url();
  console.log('Google Auth Page Title:', title);
  console.log('Google Auth Page URL:', url);

  const hasIdentifierInput = await page.isVisible('input[type="email"]');
  console.log('Has email input:', hasIdentifierInput);

  await page.screenshot({ path: 'google_auth_page.png' });
  await browser.close();
}

testGoogleSignInPage().catch(console.error);
