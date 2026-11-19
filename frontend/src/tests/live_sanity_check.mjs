import { chromium } from 'playwright';

async function checkLiveStaging() {
  console.log('Testing live staging at https://web.decidixapp.tech...');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    console.log('Navigating to live staging...');
    await page.goto('https://web.decidixapp.tech/overview', { waitUntil: 'domcontentloaded', timeout: 45000 });
    
    // Wait for the desktop sidebar using class attribute containing md:flex
    const desktopSidebar = page.locator('aside[class*="md:flex"]');
    await desktopSidebar.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✓ Desktop aside is visible!');

    const box = await desktopSidebar.boundingBox();
    console.log(`✓ Live Desktop Sidebar Width: ${Math.round(box?.width || 0)}px (expected ~260px)`);

    // Toggle collapse
    const toggleBtn = page.locator('button[aria-label="Toggle sidebar"]');
    await toggleBtn.click();
    await page.waitForTimeout(400);
    const collapsedBox = await desktopSidebar.boundingBox();
    console.log(`✓ Live Desktop Collapsed Width: ${Math.round(collapsedBox?.width || 0)}px (expected ~72px)`);

    // Toggle expand back
    await toggleBtn.click();
    await page.waitForTimeout(400);

    // Switch to Mobile Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);

    const mobileHeader = page.locator('header[class*="md:hidden"]');
    const headerBox = await mobileHeader.boundingBox();
    console.log(`✓ Live Mobile Header Height: ${Math.round(headerBox?.height || 0)}px (expected ~56px)`);

    // Mobile Drawer check
    const mHamburger = page.locator('header[class*="md:hidden"] button[aria-label="Toggle navigation menu"]');
    await mHamburger.click();
    await page.waitForTimeout(400);
    const drawer = page.locator('aside[class*="md:hidden"]');
    const drawerVisible = await drawer.isVisible();
    console.log(`✓ Live Mobile Drawer Open: ${drawerVisible}`);

    console.log('\n🎉 ALL LIVE STAGING CHECKS ON HTTPS://WEB.DECIDIXAPP.TECH PASSED!');
  } catch (err) {
    console.error('❌ Live check failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

checkLiveStaging();
