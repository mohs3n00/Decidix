import { preview } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFolderArg = process.argv.find((arg) => arg.startsWith('--folder='))?.split('=')[1] ||
  (process.argv.includes('--after') ? 'after' : 'before');

const outputDir = path.resolve(__dirname, '../../docs/audits/screenshots', targetFolderArg);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`====================================================`);
console.log(`DECIDIX VISUAL FIDELITY QA — SCREENSHOT CAPTURE`);
console.log(`Output Directory: ${outputDir}`);
console.log(`Target Viewport: 1440 × 1000`);
console.log(`====================================================\n`);

const ROUTES = [
  { id: '01_login', path: '/login', requiresAuth: false },
  { id: '02_overview', path: '/', requiresAuth: true },
  { id: '03_insights', path: '/insights', requiresAuth: true },
  { id: '04_intelligence', path: '/intelligence', requiresAuth: true },
  { id: '05_decisions', path: '/decisions', requiresAuth: true },
  { id: '06_assistant', path: '/assistant', requiresAuth: true },
  { id: '07_datasets', path: '/datasets', requiresAuth: true },
  { id: '08_map', path: '/map', requiresAuth: true },
  { id: '09_regions_list', path: '/regions', requiresAuth: true },
  { id: '10_region_profile', path: '/regions/central_capital', requiresAuth: true },
  { id: '11_comparison', path: '/insights/comparison', requiresAuth: true },
  { id: '12_historical', path: '/insights/historical', requiresAuth: true },
  { id: '13_priority', path: '/insights/priority', requiresAuth: true },
  { id: '14_data_quality', path: '/insights/data-quality', requiresAuth: true },
  { id: '15_predictions', path: '/intelligence/predictions', requiresAuth: true },
  { id: '16_recommendations', path: '/intelligence/recommendations', requiresAuth: true },
  { id: '17_simulator', path: '/decisions/simulator', requiresAuth: true },
  { id: '18_projects', path: '/decisions/projects', requiresAuth: true },
  { id: '19_citizen_reports', path: '/decisions/citizen-reports', requiresAuth: true },
  { id: '20_admin_dashboard', path: '/admin', requiresAuth: true },
  { id: '21_admin_users', path: '/admin/users', requiresAuth: true },
  { id: '22_admin_notifications', path: '/admin/notifications', requiresAuth: true },
];

async function main() {
  const previewServer = await preview({
    root: path.resolve(__dirname, '../..'),
    preview: { port: 4173, strictPort: true },
  });

  const serverUrl = 'http://localhost:4173';
  console.log(`Vite preview server running at ${serverUrl}`);

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Route interception for consistent authentication and admin data
  await page.route('**/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          user: {
            id: 'usr_admin',
            name: 'Decidix Admin',
            arabic_name: 'مدير منصة ديسيديكس',
            email: 'admin@decidixapp.tech',
            role: 'admin',
            status: 'active',
            email_verified: true,
          },
        },
      }),
    });
  });

  // Admin routes fallback data if not directly authenticated
  await page.route('**/v1/admin/dashboard*', async (route) => {
    try {
      const response = await route.fetch();
      if (response.ok()) {
        await route.fulfill({ response });
        return;
      }
    } catch {}
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          users: { total: 24, active: 24, suspended: 0, by_role: { admin: 1, analyst: 12, viewer: 11 } },
          datasets: { total_datasets: 33, validated: 29, invalid: 4, total_bytes: 44384, total_records: 309 },
          telemetry: { total_events: 184, by_module: { overview: 48, insights: 36, intelligence: 32, decisions: 28, datasets: 22, assistant: 18 } },
          notifications: { total_campaigns: 14, delivered_count: 28, active_device_tokens: 2 },
        },
      }),
    });
  });

  // Initial navigation to origin so localStorage can be populated
  await page.goto(`${serverUrl}/login`, { waitUntil: 'domcontentloaded' });

  for (const item of ROUTES) {
    const targetUrl = `${serverUrl}${item.path}`;
    process.stdout.write(`Capturing [${item.id}] ${item.path}... `);

    try {
      if (item.id === '01_login') {
        await page.evaluate(() => {
          localStorage.removeItem('decidix_access_token');
          localStorage.removeItem('decidix_user');
        });
      } else {
        await page.evaluate(() => {
          localStorage.setItem('decidix_access_token', 'qa_token_jwt_verified');
          localStorage.setItem(
            'decidix_user',
            JSON.stringify({
              id: 'usr_admin',
              name: 'Decidix Admin',
              arabic_name: 'مدير منصة ديسيديكس',
              email: 'admin@decidixapp.tech',
              role: 'admin',
              email_verified: true,
            })
          );
        });
      }

      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 20000 });
      // Ensure any initial loading spinner has finished rendering data
      await page.waitForFunction(() => !document.querySelector('.animate-spin'), { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);

      const screenshotFile = path.join(outputDir, `${item.id}.png`);
      await page.screenshot({ path: screenshotFile, fullPage: false });
      console.log(`✓ Saved (${fs.statSync(screenshotFile).size} bytes)`);
    } catch (err) {
      console.log(`✕ Failed: ${err.message}`);
    }
  }

  await browser.close();
  previewServer.httpServer.close();
  console.log(`\nScreenshot capture complete! Stored in ${outputDir}`);
}

main().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
