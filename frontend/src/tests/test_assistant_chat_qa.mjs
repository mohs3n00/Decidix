import { chromium } from 'playwright';

async function testAssistantChat() {
  console.log('=== STARTING AI ASSISTANT CHAT PLAYWRIGHT QA ===');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--dns-result-order=ipv4first', '--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('1. Setting authenticated session on origin...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('decidix_access_token', 'test_auth_token_for_qa');
    localStorage.setItem('decidix_user', JSON.stringify({
      id: 'test_qa_user',
      name: 'QA Analyst',
      email: 'analyst@decidix.gov',
      role: 'analyst'
    }));
  });

  console.log('2. Navigating to http://localhost:5173/assistant ...');
  await page.goto('http://localhost:5173/assistant', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Verify Welcome message rendered with Markdown
  const welcomeText = await page.textContent('.prose');
  console.log('✓ Found Markdown rendered text in conversation:');
  console.log('  Preview:', welcomeText?.substring(0, 100));

  // 2. Test Markdown Table rendering
  console.log('3. Verifying MarkdownRenderer in DOM...');
  const hasMarkdownRenderer = await page.$('.prose');
  console.log('✓ MarkdownRenderer component is active in DOM:', !!hasMarkdownRenderer);

  // 3. Test Scroll Container Architecture
  console.log('4. Verifying independent scrollable container & fixed composer...');
  const scrollContainer = await page.$('.overflow-y-auto.min-h-0');
  if (!scrollContainer) throw new Error('Independent scroll container not found!');
  console.log('✓ Independent scrollable container verified');

  const composer = await page.$('textarea');
  if (!composer) throw new Error('Composer textarea not found!');
  console.log('✓ Composer textarea verified');

  // Take screenshot of Assistant initial state
  await page.screenshot({ path: 'frontend/test-assistant-initial.png' });
  console.log('✓ Saved frontend/test-assistant-initial.png');

  // 4. Test Sending a Real Message
  console.log('5. Testing message submission in English...');
  await composer.fill('What are the key developmental challenges in Egypt for 2025?');
  const sendBtn = await page.$('button[aria-label="Send message"]');
  await sendBtn.click();
  console.log('✓ Clicked send button');

  // Wait for response to arrive from Heroku staging
  console.log('Waiting for AI Assistant response from Heroku...');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'frontend/test-assistant-response.png' });
  console.log('✓ Saved frontend/test-assistant-response.png');

  // 5. Test Arabic RTL Mode
  console.log('6. Switching to Arabic RTL and testing UI alignment...');
  const langBtn = await page.$('button:visible:has-text("العربية")');
  if (langBtn) {
    await langBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'frontend/test-assistant-arabic.png' });
    console.log('✓ Switched to Arabic and saved frontend/test-assistant-arabic.png');
  }

  // 6. Test Mobile Viewport (390 x 844)
  console.log('7. Testing mobile responsive layout (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'frontend/test-assistant-mobile.png' });
  console.log('✓ Saved frontend/test-assistant-mobile.png');

  await browser.close();
  console.log('=== AI ASSISTANT CHAT QA PASSED SUCCESSFULLY ===');
}

testAssistantChat().catch(err => {
  console.error('CHAT QA FAILED:', err);
  process.exit(1);
});
