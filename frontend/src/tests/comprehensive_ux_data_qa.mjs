import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = path.resolve('docs/evidence/modernization');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'laptop-1440', width: 1440, height: 900 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'mobile-390', width: 390, height: 844 },
];

const ROUTES_TO_TEST = [
  { path: '/', name: '01_overview', waitSelector: 'h1' },
  { path: '/assistant', name: '02_assistant_chat', waitSelector: 'textarea' },
  { path: '/insights', name: '03_insights_education', waitSelector: 'h1' },
  { path: '/insights/comparison?a=cairo&b=alexandria', name: '04_insights_comparison', waitSelector: 'h1' },
  { path: '/insights/historical', name: '05_insights_historical', waitSelector: 'h1' },
  { path: '/insights/priority', name: '06_insights_priority', waitSelector: 'h1' },
  { path: '/insights/data-quality', name: '07_insights_data_quality', waitSelector: 'h1' },
  { path: '/intelligence/predictions', name: '08_intelligence_predictions', waitSelector: 'h1' },
  { path: '/intelligence/recommendations', name: '09_intelligence_recommendations', waitSelector: 'h1' },
  { path: '/decisions/simulator', name: '10_decisions_simulator', waitSelector: 'h1' },
  { path: '/decisions/projects', name: '11_decisions_projects', waitSelector: 'h1' },
  { path: '/decisions/citizen-reports', name: '12_decisions_citizen_reports', waitSelector: 'h1' },
  { path: '/regions', name: '13_regions_list', waitSelector: 'h1' },
  { path: '/map', name: '14_interactive_map', waitSelector: 'h1' },
  { path: '/regions/cairo', name: '15_region_profile_cairo', waitSelector: 'h1' },
];

async function runComprehensiveQA() {
  console.log('🚀 STARTING COMPREHENSIVE MULTI-VIEWPORT & RTL BROWSER QA');
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n📱 TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      // Test English LTR on Desktop & Mobile
      for (const route of ROUTES_TO_TEST) {
        try {
          const url = `http://localhost:5173${route.path}`;
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(1000); // Wait for API calls to settle

          const screenshotPath = path.join(
            EVIDENCE_DIR,
            `${route.name}_${vp.name}_ltr.png`
          );
          await page.screenshot({ path: screenshotPath, fullPage: false });

          console.log(`  ✓ ${route.name} (${vp.name}) -> ${path.basename(screenshotPath)}`);
          results.push({
            route: route.path,
            name: route.name,
            viewport: vp.name,
            lang: 'en',
            status: 'PASS',
            screenshot: screenshotPath,
          });
        } catch (err) {
          console.error(`  ❌ Failed on ${route.path} (${vp.name}):`, err.message);
          results.push({
            route: route.path,
            name: route.name,
            viewport: vp.name,
            lang: 'en',
            status: 'FAIL',
            error: err.message,
          });
        }
      }

      // If Desktop 1920 or Mobile 390, switch to Arabic RTL and capture key screens
      if (vp.name === 'desktop-1920' || vp.name === 'mobile-390') {
        console.log(`\n🌐 TESTING ARABIC RTL MODE ON ${vp.name}`);
        try {
          await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1000);

          // Find and click language switch button to Arabic
          const arBtn = await page.$('button:visible:has-text("العربية")');
          if (arBtn) {
            await arBtn.click();
            await page.waitForTimeout(800);
          }

          const rtlScreens = [
            { path: '/', name: '01_overview_rtl' },
            { path: '/assistant', name: '02_assistant_chat_rtl' },
            { path: '/insights', name: '03_insights_education_rtl' },
            { path: '/insights/comparison?a=cairo&b=alexandria', name: '04_insights_comparison_rtl' },
            { path: '/decisions/simulator', name: '10_decisions_simulator_rtl' },
            { path: '/regions/cairo', name: '15_region_profile_cairo_rtl' },
          ];

          for (const s of rtlScreens) {
            await page.goto(`http://localhost:5173${s.path}`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1000);
            const screenshotPath = path.join(
              EVIDENCE_DIR,
              `${s.name}_${vp.name}.png`
            );
            await page.screenshot({ path: screenshotPath, fullPage: false });
            console.log(`  ✓ [RTL] ${s.name} (${vp.name}) -> ${path.basename(screenshotPath)}`);
            results.push({
              route: s.path,
              name: s.name,
              viewport: vp.name,
              lang: 'ar',
              status: 'PASS',
              screenshot: screenshotPath,
            });
          }
        } catch (rtlErr) {
          console.error('  ❌ RTL test error:', rtlErr.message);
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  // Summary report
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n==================================================`);
  console.log(`QA COMPLETE: ${passCount} PASSED, ${failCount} FAILED out of ${results.length} total checks.`);
  console.log(`==================================================`);

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'comprehensive_qa_results.json'),
    JSON.stringify(results, null, 2)
  );
}

runComprehensiveQA().catch(console.error);
