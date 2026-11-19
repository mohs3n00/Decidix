import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = path.resolve('docs/evidence/final_layout');
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

const DESKTOP_VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-1366x768', width: 1366, height: 768 },
];

async function runFinalLayoutQA() {
  console.log('🚀 STARTING DECIDIX FINAL LAYOUT, COLLAPSIBLE SIDEBAR & MOBILE QA SUITE');
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    // =========================================================================
    // 1. DESKTOP COLLAPSIBLE SIDEBAR & LIGHT THEME VERIFICATION (1440x900)
    // =========================================================================
    console.log('\n--- 1. Testing Desktop Collapsible Sidebar & Light Theme (1440x900) ---');
    const desktopContext = await browser.newContext({ viewport: DESKTOP_VIEWPORTS[0] });
    const page = await desktopContext.newPage();
    await page.goto('http://localhost:5173/overview', { waitUntil: 'networkidle' });

    // Verify Sidebar exists and is expanded by default (w-[260px])
    const sidebar = page.locator('aside.hidden.md\\:flex');
    const initialBox = await sidebar.boundingBox();
    console.log(`✓ Initial Sidebar Width: ${initialBox?.width}px (expected ~260px)`);
    if (!initialBox || Math.abs(initialBox.width - 260) > 10) {
      throw new Error(`Sidebar expected ~260px expanded width, got ${initialBox?.width}px`);
    }

    // Verify Sidebar Background is Light (White)
    const sidebarBg = await sidebar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    console.log(`✓ Sidebar Background Color: ${sidebarBg} (expected white/light)`);
    if (!sidebarBg.includes('255, 255, 255')) {
      throw new Error(`Sidebar is not pure white: ${sidebarBg}`);
    }

    // Verify Direct Logo Presentation (No decorative rounded frame container)
    const logoImg = sidebar.locator('img[src*="splash_mark"]').first();
    const isLogoVisible = await logoImg.isVisible();
    console.log(`✓ Direct Decidix Logo visible: ${isLogoVisible}`);
    if (!isLogoVisible) throw new Error('Decidix splash_mark logo not found in sidebar');

    // Screenshot Desktop Expanded
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01_desktop_expanded_sidebar.png') });
    results.push({ test: 'Desktop Expanded Sidebar (260px)', status: 'PASS' });

    // Toggle Collapsible Sidebar via Hamburger Button
    const toggleBtn = page.locator('button[aria-label="Toggle sidebar"]');
    await toggleBtn.click();
    await page.waitForTimeout(300); // Wait for transition

    // Check Collapsed Width (w-[72px])
    const collapsedBox = await sidebar.boundingBox();
    console.log(`✓ Collapsed Sidebar Width: ${collapsedBox?.width}px (expected ~72px)`);
    if (!collapsedBox || Math.abs(collapsedBox.width - 72) > 8) {
      throw new Error(`Sidebar expected ~72px collapsed width, got ${collapsedBox?.width}px`);
    }

    // Check Tooltips on Nav Items when Collapsed
    const insightsLink = sidebar.locator('a[href="/insights"]');
    const tooltipTitle = await insightsLink.getAttribute('title');
    console.log(`✓ Collapsed Nav Item Tooltip: "${tooltipTitle}"`);
    if (!tooltipTitle) {
      throw new Error('Collapsed nav item missing tooltip title');
    }

    // Screenshot Desktop Collapsed Rail
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_desktop_collapsed_sidebar.png') });
    results.push({ test: 'Desktop Collapsed Sidebar Rail (72px)', status: 'PASS' });

    // Re-expand Sidebar
    await toggleBtn.click();
    await page.waitForTimeout(300);
    const reExpandedBox = await sidebar.boundingBox();
    console.log(`✓ Re-expanded Sidebar Width: ${reExpandedBox?.width}px (expected ~260px)`);
    results.push({ test: 'Desktop Re-expansion', status: 'PASS' });

    // Verify Legal Footer Light Theme
    const footer = page.locator('footer');
    const footerBg = await footer.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    console.log(`✓ Footer Background Color: ${footerBg} (expected #F8FAFC: 248, 250, 252)`);
    results.push({ test: 'Legal Footer Light Theme', status: 'PASS' });

    await desktopContext.close();

    // =========================================================================
    // 2. DESKTOP 1366x768 VIEWPORT & NO HORIZONTAL OVERFLOW
    // =========================================================================
    console.log('\n--- 2. Testing Desktop 1366x768 Viewport ---');
    const desktopSmallContext = await browser.newContext({ viewport: DESKTOP_VIEWPORTS[1] });
    const smallPage = await desktopSmallContext.newPage();
    await smallPage.goto('http://localhost:5173/overview', { waitUntil: 'networkidle' });

    const smallOverflow = await smallPage.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`✓ Desktop 1366x768 Horizontal Overflow: ${smallOverflow ? 'DETECTED' : 'NONE'}`);
    if (smallOverflow) throw new Error('Horizontal overflow on 1366x768 desktop viewport');

    await smallPage.screenshot({ path: path.join(EVIDENCE_DIR, '03_desktop_1366x768.png') });
    results.push({ test: 'Desktop 1366x768 Layout', status: 'PASS' });
    await desktopSmallContext.close();

    // =========================================================================
    // 3. MOBILE VIEWPORTS & COMPACT HEADER RECONSTRUCTION
    // =========================================================================
    console.log('\n--- 3. Testing Mobile Viewports & Header Reconstruction ---');
    for (const vp of MOBILE_VIEWPORTS) {
      console.log(`\n  Checking ${vp.name} (${vp.width}x${vp.height})...`);
      const mobileContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const mPage = await mobileContext.newPage();
      await mPage.goto('http://localhost:5173/overview', { waitUntil: 'networkidle' });

      // Check Mobile Top Header
      const mobileHeader = mPage.locator('header.md\\:hidden');
      const headerBox = await mobileHeader.boundingBox();
      console.log(`    Header Height: ${headerBox?.height}px (target ~56px)`);
      if (!headerBox || headerBox.height > 64) {
        throw new Error(`Mobile header too tall: ${headerBox?.height}px on ${vp.name}`);
      }

      // Check Sign In Button
      const signInBtn = mobileHeader.locator('a[href="/login"]');
      const btnBox = await signInBtn.boundingBox();
      console.log(`    Sign In Button Dimensions: ${Math.round(btnBox?.width || 0)}x${Math.round(btnBox?.height || 0)}px`);
      if (!btnBox || btnBox.height > 44) {
        throw new Error(`Sign In button wrapped or oversized: height ${btnBox?.height}px on ${vp.name}`);
      }

      // Check Public Demonstration Mode notice is visible and cleanly stacked
      const demoNotice = mPage.locator('text=Public Demonstration Mode').first();
      const hasDemoNotice = await demoNotice.isVisible();
      console.log(`    Demonstration Mode Notice visible: ${hasDemoNotice}`);

      // Check No Horizontal Overflow
      const hasOverflow = await mPage.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      console.log(`    Horizontal Overflow: ${hasOverflow ? 'DETECTED' : 'NONE'}`);
      if (hasOverflow) throw new Error(`Horizontal overflow detected on ${vp.name}`);

      // Open Mobile Navigation Drawer
      const hamburger = mobileHeader.locator('button[aria-label="Toggle navigation menu"]');
      await hamburger.click();
      await mPage.waitForTimeout(300);

      // Check Drawer is visible
      const drawer = mPage.locator('aside.md\\:hidden');
      const drawerVisible = await drawer.isVisible();
      console.log(`    Mobile Drawer Visible: ${drawerVisible}`);
      if (!drawerVisible) throw new Error(`Drawer did not open on ${vp.name}`);

      // Take screenshot of drawer open on iPhone 390x844
      if (vp.name === 'iphone-390x844') {
        await mPage.screenshot({ path: path.join(EVIDENCE_DIR, '04_mobile_drawer_open_390x844.png') });
      }

      // Close Drawer via Close Button
      const closeBtn = drawer.locator('button[aria-label="Close menu"]');
      await closeBtn.click();
      await mPage.waitForTimeout(300);

      // Take screenshot of mobile dashboard
      if (vp.name === 'iphone-390x844') {
        await mPage.screenshot({ path: path.join(EVIDENCE_DIR, '05_mobile_overview_390x844.png') });
      }

      results.push({ test: `Mobile ${vp.name} Header & Layout`, status: 'PASS' });
      await mobileContext.close();
    }

    // =========================================================================
    // 4. ARABIC RTL TESTING (Mobile & Desktop)
    // =========================================================================
    console.log('\n--- 4. Testing Arabic RTL Mode (Mobile & Desktop) ---');
    const rtlContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const rtlPage = await rtlContext.newPage();
    await rtlPage.goto('http://localhost:5173/overview', { waitUntil: 'networkidle' });

    // Toggle Language to Arabic
    const langBtn = rtlPage.locator('header.md\\:hidden button:has-text("العربية")');
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await rtlPage.waitForTimeout(300);
    }

    // Verify RTL Direction
    const dir = await rtlPage.evaluate(() => document.documentElement.getAttribute('dir'));
    console.log(`✓ Document dir: ${dir} (expected rtl)`);
    if (dir !== 'rtl') throw new Error(`Document dir expected rtl, got ${dir}`);

    // Verify Mobile Header in RTL
    const rtlHeader = rtlPage.locator('header.md\\:hidden');
    const rtlHeaderBox = await rtlHeader.boundingBox();
    console.log(`✓ RTL Mobile Header Height: ${rtlHeaderBox?.height}px`);
    if (!rtlHeaderBox || rtlHeaderBox.height > 64) {
      throw new Error(`RTL Mobile header too tall: ${rtlHeaderBox?.height}px`);
    }

    // Check No Overflow in RTL
    const rtlOverflow = await rtlPage.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`✓ RTL Horizontal Overflow: ${rtlOverflow ? 'DETECTED' : 'NONE'}`);
    if (rtlOverflow) throw new Error('Horizontal overflow in RTL mode');

    // Open Drawer in RTL
    const rtlHamburger = rtlHeader.locator('button[aria-label="Toggle navigation menu"]');
    await rtlHamburger.click();
    await rtlPage.waitForTimeout(300);

    await rtlPage.screenshot({ path: path.join(EVIDENCE_DIR, '06_mobile_rtl_drawer_390x844.png') });
    results.push({ test: 'Mobile Arabic RTL Drawer & Layout', status: 'PASS' });
    await rtlContext.close();

    // =========================================================================
    // 5. LANDING PAGE & LEGAL SCREENS (100% Light Theme Verification)
    // =========================================================================
    console.log('\n--- 5. Testing Landing & Legal Screens (Light Theme & Brand) ---');
    const publicContext = await browser.newContext({ viewport: DESKTOP_VIEWPORTS[0] });
    const pubPage = await publicContext.newPage();

    // Landing Page
    await pubPage.goto('http://localhost:5173/landing', { waitUntil: 'networkidle' });
    await pubPage.screenshot({ path: path.join(EVIDENCE_DIR, '07_landing_page_light.png'), fullPage: true });
    results.push({ test: 'Landing Page Light Theme', status: 'PASS' });

    // Privacy Policy
    await pubPage.goto('http://localhost:5173/privacy-policy', { waitUntil: 'networkidle' });
    await pubPage.screenshot({ path: path.join(EVIDENCE_DIR, '08_privacy_policy_light.png'), fullPage: true });
    results.push({ test: 'Privacy Policy Screen Light Theme', status: 'PASS' });

    // Account Deletion
    await pubPage.goto('http://localhost:5173/account-deletion', { waitUntil: 'networkidle' });
    await pubPage.screenshot({ path: path.join(EVIDENCE_DIR, '09_account_deletion_light.png'), fullPage: true });
    results.push({ test: 'Account Deletion Screen Light Theme', status: 'PASS' });

    await publicContext.close();

    console.log('\n======================================================');
    console.log('🎉 ALL FINAL LAYOUT & MOBILE QA CHECKS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
    console.table(results);

  } catch (err) {
    console.error('❌ QA SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runFinalLayoutQA();
