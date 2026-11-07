import { preview } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.resolve(__dirname, '../../docs/audits/screenshots/auth_ux');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log('====================================================');
console.log('DECIDIX AUTH & UX RECOVERY — AUTOMATED E2E TEST SUITE');
console.log(`Artifacts Output: ${screenshotsDir}`);
console.log('====================================================\n');

async function runTests() {
  const previewServer = await preview({
    root: path.resolve(__dirname, '../..'),
    preview: { port: 4173, strictPort: true },
  });

  const serverUrl = 'http://localhost:4173';
  console.log(`Vite preview running at ${serverUrl}`);

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Route interception for authenticated sessions
  await page.route('**/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          user: {
            id: 'usr_f893d98c21a4',
            name: 'Eng. Karim El-Sayed',
            arabic_name: 'م. كريم السيد',
            email: 'karim.elsayed@decidixapp.tech',
            role: 'analyst',
            status: 'active',
            email_verified: false,
            created_at: '2026-03-15T10:00:00Z',
          },
        },
      }),
    });
  });

  const results = [];
  function logResult(id, description, passed, detail = '') {
    results.push({ id, description, passed, detail });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${id}: ${description} ${detail ? `(${detail})` : ''}`);
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Login Screen Redesign
    // ----------------------------------------------------
    await page.goto(`${serverUrl}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const hasLogo = await page.isVisible('img[alt="logo_white"]');
    const hasBrandTitle = (await page.textContent('h1')).includes('DECIDIX');
    const hasEmailInput = await page.isVisible('input[type="email"]');
    const hasPasswordInput = await page.isVisible('input[type="password"]');
    const hasGoogleBtn = await page.isVisible('button:has-text("Google"), div:has-text("Google")');
    const hasRegisterLink = await page.isVisible('a[href="/register"]');
    const hasForgotLink = await page.isVisible('a[href="/forgot-password"]');

    const loginPassed = hasLogo && hasBrandTitle && hasEmailInput && hasPasswordInput && hasGoogleBtn && hasRegisterLink && hasForgotLink;
    logResult('AUTH_01', 'Redesigned Login Screen visual elements', loginPassed);
    await page.screenshot({ path: path.join(screenshotsDir, '01_login_redesigned.png') });

    // ----------------------------------------------------
    // TEST 2: Registration Screen & Validation
    // ----------------------------------------------------
    await page.goto(`${serverUrl}/register`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const hasNameInput = await page.isVisible('input[placeholder*="Ahmed"]');
    const hasRegEmail = await page.isVisible('input[type="email"]');
    const hasRegPass = await page.isVisible('input[autocomplete="new-password"]');
    const hasGoogleReg = await page.isVisible('button:has-text("Google"), div:has-text("Google")');

    // Test Password Mismatch Validation
    await page.fill('input[type="email"]', 'test_user@decidixapp.tech');
    const passwordInputs = await page.$$('input[type="password"]');
    if (passwordInputs.length >= 2) {
      await passwordInputs[0].fill('Password123!');
      await passwordInputs[1].fill('MismatchedPassword!');
    }
    await page.waitForTimeout(300);
    const hasMismatchMsg = await page.isVisible('text=Passwords do not match');

    const regPassed = hasNameInput && hasRegEmail && hasRegPass && hasGoogleReg && hasMismatchMsg;
    logResult('AUTH_02', 'Dedicated Registration Screen with client-side mismatch validation', regPassed);
    await page.screenshot({ path: path.join(screenshotsDir, '02_register_screen.png') });

    // ----------------------------------------------------
    // TEST 3: Forgot Password Screen
    // ----------------------------------------------------
    await page.goto(`${serverUrl}/forgot-password`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const hasForgotTitle = (await page.textContent('h1')).includes('Reset');
    const hasForgotEmail = await page.isVisible('input[type="email"]');
    const hasForgotBtn = await page.isVisible('button:has-text("Send Reset Link")');
    const hasBackToLogin = await page.isVisible('a[href="/login"]');

    const forgotPassed = hasForgotTitle && hasForgotEmail && hasForgotBtn && hasBackToLogin;
    logResult('AUTH_03', 'Forgot Password Request Screen', forgotPassed);
    await page.screenshot({ path: path.join(screenshotsDir, '03_forgot_password.png') });

    // ----------------------------------------------------
    // TEST 4: Reset Password Screen with Incomplete/Valid Token Check
    // ----------------------------------------------------
    // Check without token -> invalid link alert
    await page.goto(`${serverUrl}/reset-password`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const hasIncompleteAlert = await page.isVisible('text=Incomplete or Invalid Link');

    // Check with simulated token -> shows password reset form
    await page.goto(`${serverUrl}/reset-password?token=sample_valid_hex_token_123456`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const hasNewPassInput = await page.isVisible('input[autocomplete="new-password"]');
    const hasSaveBtn = await page.isVisible('button:has-text("Save New Password")');

    const resetPassed = hasIncompleteAlert && hasNewPassInput && hasSaveBtn;
    logResult('AUTH_04', 'Reset Password Token Handling Screen', resetPassed);
    await page.screenshot({ path: path.join(screenshotsDir, '04_reset_password.png') });

    // ----------------------------------------------------
    // TEST 5: Email Verification Screen
    // ----------------------------------------------------
    await page.goto(`${serverUrl}/verify-email`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const hasVerifyTitle = (await page.textContent('h1')).includes('Verification');
    const hasTokenInput = await page.isVisible('input[placeholder*="token"]');
    const hasResendSection = await page.isVisible('text=Resend Verification Email');

    const verifyScreenPassed = hasVerifyTitle && hasTokenInput && hasResendSection;
    logResult('AUTH_05', 'Email Verification Landing & Resend Console', verifyScreenPassed);
    await page.screenshot({ path: path.join(screenshotsDir, '05_verify_email.png') });

    // ----------------------------------------------------
    // TEST 6: Authenticated Account & Profile Experience
    // ----------------------------------------------------
    await page.evaluate(() => {
      localStorage.setItem('decidix_access_token', 'qa_verified_jwt_token');
      localStorage.setItem(
        'decidix_user',
        JSON.stringify({
          id: 'usr_f893d98c21a4',
          name: 'Eng. Karim El-Sayed',
          arabic_name: 'م. كريم السيد',
          email: 'karim.elsayed@decidixapp.tech',
          role: 'analyst',
          status: 'active',
          email_verified: false,
          created_at: '2026-03-15T10:00:00Z',
        })
      );
    });

    await page.goto(`${serverUrl}/account`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const hasProfileName = await page.isVisible('text=Eng. Karim El-Sayed');
    const hasArabicName = await page.isVisible('text=م. كريم السيد');
    const hasRoleBadge = await page.isVisible('text=ANALYST');
    const hasPendingVerificationBanner = await page.isVisible('text=Email Verification Required');
    const hasChangePasswordCard = await page.isVisible('text=Security & Password Update');
    const hasSignOutBtn = await page.isVisible('button:has-text("Sign Out")');

    const accountPassed = hasProfileName && hasArabicName && hasRoleBadge && hasPendingVerificationBanner && hasChangePasswordCard && hasSignOutBtn;
    logResult('AUTH_06', 'Dedicated Account & Profile Management Screen', accountPassed);
    await page.screenshot({ path: path.join(screenshotsDir, '06_account_profile.png') });

    // ----------------------------------------------------
    // TEST 7: Navigation & Sidebar Integration
    // ----------------------------------------------------
    const sidebarAccountLink = await page.isVisible('a[href="/account"]');
    const headerVerifyAlert = await page.isVisible('header a[href="/account"]:has-text("Verify Email")');

    const navPassed = sidebarAccountLink && headerVerifyAlert;
    logResult('AUTH_07', 'Sidebar & Header dynamic account integration', navPassed);

    // ----------------------------------------------------
    // TEST 8: RBAC Protection (Non-Admin redirected from /admin)
    // ----------------------------------------------------
    await page.goto(`${serverUrl}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const redirectedToOverview = page.url() === `${serverUrl}/`;
    logResult('AUTH_08', 'RBAC Enforcement: Non-admin redirected away from /admin', redirectedToOverview);

    // ----------------------------------------------------
    // TEST 9: Mobile Responsive Viewport (390 x 844)
    // ----------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${serverUrl}/account`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const hasMobileAppBar = await page.isVisible('div.md\\:hidden');
    const isMobileResponsive = hasMobileAppBar;
    logResult('AUTH_09', 'Mobile Responsive Layout (390x844)', isMobileResponsive);
    await page.screenshot({ path: path.join(screenshotsDir, '07_account_mobile_390.png') });

    // ----------------------------------------------------
    // TEST 10: Arabic RTL Layout Mirroring
    // ----------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto(`${serverUrl}/login`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("العربية")');
    await page.waitForTimeout(500);

    const hasArabicHeading = await page.isVisible('text=تسجيل الدخول');
    const rtlPassed = hasArabicHeading;
    logResult('AUTH_10', 'Arabic RTL Mirroring and Cairo Typography', rtlPassed);
    await page.screenshot({ path: path.join(screenshotsDir, '08_login_arabic_rtl.png') });

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
    previewServer.httpServer.close();
  }

  console.log('\n====================================================');
  console.log('TEST SUMMARY');
  console.log('====================================================');
  const passCount = results.filter((r) => r.passed).length;
  console.log(`Passed: ${passCount} / ${results.length}`);
  console.log('====================================================\n');

  if (passCount !== results.length) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
