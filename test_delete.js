import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  page.on('dialog', async dialog => {
    console.log('DIALOG TRIGGERED:', dialog.message());
    await dialog.accept();
    console.log('DIALOG ACCEPTED');
  });

  await page.goto('http://localhost:5174/tasks');
  await page.waitForLoadState('networkidle');
  
  console.log('Clicking the trash icon for TEST_001...');
  
  // Find the row for TEST_001
  const deleteBtn = page.locator('tr').filter({ hasText: 'TEST_001' }).locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
  
  if (await deleteBtn.count() > 0) {
    await deleteBtn.click();
    await page.waitForTimeout(2000); // Wait for potential re-render
    
    const count = await page.locator('tr').filter({ hasText: 'TEST_001' }).count();
    console.log(`Rows remaining for TEST_001: ${count}`);
  } else {
    console.log('Could not find TEST_001 delete button.');
  }
  
  await browser.close();
})();
