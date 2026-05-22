const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    console.log('Logging in...');
    await page.goto('https://teaching-practice-eval.pages.dev/login');
    
    // Click on the student account card
    await page.click('text=山田 太郎');
    
    // Wait for dashboard to load
    await page.waitForSelector('text=山田 太郎', { timeout: 15000 });
    console.log('Logged in successfully.');
    
    const results = [];

    const journals = [
      { id: 'test-crash-1', name: 'Abnormal 1' },
      { id: 'test-crash-2', name: 'Abnormal 2' }
    ];

    for (const j of journals) {
      console.log(`Navigating to ${j.name} journal ${j.id}...`);
      await page.goto(`https://teaching-practice-eval.pages.dev/evaluations/${j.id}`);
      await page.waitForTimeout(3000); // wait for load
      
      const content = await page.textContent('body');
      
      const hasRenderError = content.includes('Application Error') || content.includes('cannot render');
      const hasUnassessed = content.includes('未評価');
      const hasErrorAlert = content.includes('評価結果が見つかりません');
      const hasButton = content.includes('AI評価を実行する');
      
      console.log(`Journal ${j.id} - Error Alert: ${hasErrorAlert}, Has Button: ${hasButton}`);
      
      // Capture screenshot
      await page.screenshot({ path: `${j.id}_fix.png`, fullPage: true });
      
      results.push({
        id: j.id,
        type: j.name,
        hasErrorAlert,
        hasButton
      });
    }
    
    console.log("Summary:", JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();
