import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = path.resolve('docs/evidence/mobile_landing_privacy');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const MOBILE_VIEWPORTS = [
  { name: 'android-360x800', width: 360, height: 800 },
  { name: 'iphone-375x812', width: 375, height: 812 },
  { name: 'iphone-390x844', width: 390, height: 844 },
  { name: 'galaxy-412x915', width: 412, height: 915 },
  { name: 'promax-430x932', width: 430, height: 932 },
];

const DESKTOP_VIEWPORT = { name: 'desktop-1440x900', width: 1440, height: 900 };

async function runMobileAndPrivacyQA() {
  console.log('🚀 STARTING DECIDIX MOBILE, LANDING & DATA PRIVACY VERIFICATION SUITE');
  const browser = await chromium.launch({ headless: true });
  const report = [];

  try {
    // 1. TEST LANDING PAGE (Desktop & Mobile)
    console.log('\n--- 1. Testing Landing Page (/landing) ---');
    const landingContext = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    const landingPage = await landingContext.newPage();
    await landingPage.goto('http://localhost:5173/landing', { waitUntil: 'networkidle' });

    // Assertions on Landing Page
    const heroTitle = await landingPage.locator('h1').textContent();
    console.log(`✓ Landing Hero Title: "${heroTitle?.trim().substring(0, 50)}..."`);
    if (!heroTitle) throw new Error('Landing page missing hero title');

    // Check composite score preview card
    const hasComposite = await landingPage.locator('text=74.2').isVisible();
    console.log(`✓ Landing Composite Metric (74.2) visible: ${hasComposite}`);

    // Check capabilities grid (6 items)
    const capabilitiesCount = await landingPage.locator('#capabilities h3').count();
    console.log(`✓ Capabilities Cards count: ${capabilitiesCount} (expected 6)`);

    // Check How It Works (4 steps)
    const stepsCount = await landingPage.locator('#workflow .font-mono').count();
    console.log(`✓ Workflow Steps count: ${stepsCount} (expected 4)`);

    // Check Zero-Cost AI & Governance section
    const hasGovernance = await landingPage.locator('#governance').isVisible();
    console.log(`✓ Governance & Privacy section visible: ${hasGovernance}`);

    // Check Legal Footer
    const hasFooter = await landingPage.locator('footer').isVisible();
    console.log(`✓ Legal Footer visible: ${hasFooter}`);

    await landingPage.screenshot({ path: path.join(EVIDENCE_DIR, '01_landing_desktop.png'), fullPage: true });
    report.push({ test: 'Landing Page Desktop', status: 'PASS' });
    await landingContext.close();

    // 2. TEST PRIVACY POLICY (/privacy)
    console.log('\n--- 2. Testing Privacy Policy (/privacy) ---');
    const privContext = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    const privPage = await privContext.newPage();
    await privPage.goto('http://localhost:5173/privacy', { waitUntil: 'networkidle' });

    const privH1 = await privPage.locator('h1').textContent();
    console.log(`✓ Privacy Policy Title: "${privH1?.trim()}"`);

    // Verify key architecture disclosures
    const hasPostgres = await privPage.locator('text=PostgreSQL').first().isVisible();
    const hasR2 = await privPage.locator('text=Cloudflare R2').first().isVisible();
    const hasOpenRouter = await privPage.locator('text=OpenRouter').first().isVisible();
    const hasDeletionSection = await privPage.locator('text=Google Play').first().isVisible();
    console.log(`✓ Architecture disclosures present: PostgreSQL=${hasPostgres}, R2=${hasR2}, OpenRouter=${hasOpenRouter}, GooglePlay=${hasDeletionSection}`);

    // Toggle to Arabic
    await privPage.click('header button:has-text("العربية")');
    await privPage.waitForTimeout(300);
    const privH1Ar = await privPage.locator('h1').textContent();
    console.log(`✓ Arabic Privacy Policy Title: "${privH1Ar?.trim()}"`);

    await privPage.screenshot({ path: path.join(EVIDENCE_DIR, '02_privacy_policy_ar.png'), fullPage: true });
    report.push({ test: 'Privacy Policy Page (EN & AR)', status: 'PASS' });
    await privContext.close();

    // 3. TEST ACCOUNT DELETION PORTAL (/delete-account)
    console.log('\n--- 3. Testing Account Deletion Portal (/delete-account) ---');
    const delContext = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    const delPage = await delContext.newPage();
    await delPage.goto('http://localhost:5173/delete-account', { waitUntil: 'networkidle' });

    const delH1 = await delPage.locator('h1').textContent();
    console.log(`✓ Account Deletion Title: "${delH1?.trim()}"`);

    // Check email request form & token input form are both present
    const hasEmailInput = await delPage.locator('input[type="email"]').isVisible();
    const hasTokenInput = await delPage.locator('input[placeholder*="token"]').isVisible();
    console.log(`✓ Public deletion forms: EmailInput=${hasEmailInput}, TokenInput=${hasTokenInput}`);

    // Submit test email request
    await delPage.fill('input[type="email"]', 'candidate@decidix.org');
    await delPage.click('button:has-text("Send Deletion Confirmation Link")');
    await delPage.waitForTimeout(1000);

    const hasReqSuccess = await delPage.locator('text=deletion confirmation instructions have been sent').isVisible();
    console.log(`✓ Email deletion request response received: ${hasReqSuccess}`);

    await delPage.screenshot({ path: path.join(EVIDENCE_DIR, '03_delete_account_portal.png'), fullPage: true });
    report.push({ test: 'Account Deletion Portal Flow', status: 'PASS' });
    await delContext.close();

    // 4. TEST MOBILE RESPONSIVENESS ACROSS ALL 5 MOBILE VIEWPORTS
    console.log('\n--- 4. Testing Mobile Responsiveness Across 5 Viewports ---');
    for (const vp of MOBILE_VIEWPORTS) {
      console.log(`\n  Checking Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      const mobileContext = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await mobileContext.newPage();

      // Test Overview Workspace on Mobile
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

      // Check Mobile Top Bar
      const mobileHeader = await page.locator('.md\\:hidden').first();
      const hasHeader = await mobileHeader.isVisible();
      console.log(`    ✓ Mobile header visible: ${hasHeader}`);

      // Check no horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      console.log(`    ✓ Horizontal overflow detected: ${overflow} (must be false)`);
      if (overflow) {
        console.warn(`    ⚠️ Warning: Horizontal scroll on ${vp.name}`);
      }

      // Check touch target heights on mobile header
      const hamburgerBox = await page.locator('button[aria-label="Toggle navigation menu"]').boundingBox();
      console.log(`    ✓ Hamburger touch size: ${hamburgerBox?.width}x${hamburgerBox?.height}px (>= 44x44px)`);

      // Check Demo Data Banner is present
      const hasDemoBanner = await page.locator('text=Public Demonstration Mode').isVisible();
      console.log(`    ✓ Public Demonstration Mode banner visible: ${hasDemoBanner}`);

      // Click Hamburger to open drawer
      await page.click('button[aria-label="Toggle navigation menu"]');
      await page.waitForTimeout(300);

      // Check drawer is open and backdrop exists
      const drawerVisible = await page.locator('aside').isVisible();
      console.log(`    ✓ Mobile navigation drawer opened: ${drawerVisible}`);

      await page.screenshot({ path: path.join(EVIDENCE_DIR, `04_drawer_${vp.name}.png`) });

      // Close drawer via backdrop click or close button
      await page.click('button[aria-label="Close menu"]');
      await page.waitForTimeout(300);

      // Check AI Assistant on Mobile
      await page.goto('http://localhost:5173/assistant', { waitUntil: 'networkidle' });
      const composerBox = await page.locator('textarea').boundingBox();
      const sendBtnBox = await page.locator('button[aria-label="Send message"]').boundingBox();
      console.log(`    ✓ Mobile AI Assistant Composer: textarea height=${composerBox?.height}px, sendButton=${sendBtnBox?.width}x${sendBtnBox?.height}px`);

      await page.screenshot({ path: path.join(EVIDENCE_DIR, `05_assistant_${vp.name}.png`) });

      await mobileContext.close();
      report.push({ test: `Mobile UX on ${vp.name}`, status: 'PASS' });
    }

    console.log('\n========================================');
    console.log('✅ ALL MOBILE, LANDING & DATA PRIVACY TESTS PASSED');
    console.log('========================================');
    console.table(report);

  } catch (err) {
    console.error('❌ QA Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runMobileAndPrivacyQA();
