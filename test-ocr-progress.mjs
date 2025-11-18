import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: msg.type(), text, timestamp: new Date().toISOString() });
    console.log(`[${msg.type().toUpperCase()}] ${text}`);
  });

  page.on('pageerror', error => {
    console.error(`[PAGE ERROR] ${error.message}`);
    logs.push({ type: 'error', text: error.message, timestamp: new Date().toISOString() });
  });

  try {
    console.log('\n========== OCR PROGRESS LOGGING TEST ==========\n');
    
    console.log('1. Opening http://localhost:3000...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('   ✅ Page loaded\n');

    console.log('2. Clicking OCR tab...');
    const ocrTab = page.locator('text=OCR Import');
    await ocrTab.click();
    await page.waitForTimeout(2000);
    console.log('   ✅ OCR tab opened\n');

    console.log('3. Checking for OCR initialization...');
    await page.waitForTimeout(3000);
    const initLog = page.locator('text=/Initializing OCR engine|OCR engine ready/');
    const initVisible = await initLog.first().isVisible().catch(() => false);
    console.log(`   ${initVisible ? '✅' : '❌'} Initialization log: ${initVisible ? 'visible' : 'NOT visible'}\n`);

    console.log('4. Checking progress log container...');
    const progressLog = page.locator('.bg-gray-900').first();
    const progressLogVisible = await progressLog.isVisible().catch(() => false);
    console.log(`   ${progressLogVisible ? '✅' : '❌'} Progress log container: ${progressLogVisible ? 'visible' : 'NOT visible'}\n`);

    console.log('5. Counting initial log entries...');
    const logEntries = await page.locator('.bg-gray-900 > div > div').count();
    console.log(`   Found ${logEntries} log entries\n`);

    console.log('6. Looking for file input...');
    const fileInput = page.locator('input[type="file"]');
    const fileInputExists = await fileInput.count() > 0;
    console.log(`   ${fileInputExists ? '✅' : '❌'} File input: ${fileInputExists ? 'found' : 'NOT found'}\n`);

    if (fileInputExists) {
      console.log('7. Creating test HEIC file (simulated with JPG)...');
      // Create a simple test image file
      const testImagePath = join(__dirname, 'test-image.jpg');
      
      console.log('8. Uploading test file...');
      await fileInput.setInputFiles(testImagePath);
      console.log('   ✅ File uploaded\n');

      console.log('9. Waiting for processing to start...');
      await page.waitForTimeout(2000);

      console.log('10. Checking for "Processing" message...');
      const processingMsg = page.locator('text=/Processing.*test-image/');
      const processingVisible = await processingMsg.isVisible().catch(() => false);
      console.log(`   ${processingVisible ? '✅' : '❌'} Processing message: ${processingVisible ? 'visible' : 'NOT visible'}\n`);

      console.log('11. Monitoring progress logs for 10 seconds...');
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(1000);
        const currentLogCount = await page.locator('.bg-gray-900 > div > div').count();
        console.log(`   [${i + 1}s] Log entries: ${currentLogCount}`);
      }

      console.log('\n12. Checking for specific progress messages...');
      const messages = [
        'Reading file',
        'File read and preprocessed',
        'Applied: grayscale',
        'Running OCR',
        'OCR complete',
        'Extracted',
      ];

      for (const msg of messages) {
        const msgLocator = page.locator(`text=/${msg}/`);
        const msgVisible = await msgLocator.first().isVisible().catch(() => false);
        console.log(`   ${msgVisible ? '✅' : '❌'} "${msg}": ${msgVisible ? 'visible' : 'NOT visible'}`);
      }

      console.log('\n13. Checking for preprocessed image display...');
      const imagePreview = page.locator('img[alt*="Preprocessed"]');
      const imageCount = await imagePreview.count();
      console.log(`   Found ${imageCount} preprocessed image(s)\n`);

      console.log('14. Checking for extracted text results...');
      const resultsSection = page.locator('text=/Extracted Text Results|All extracted text/');
      const resultsVisible = await resultsSection.first().isVisible().catch(() => false);
      console.log(`   ${resultsVisible ? '✅' : '❌'} Results section: ${resultsVisible ? 'visible' : 'NOT visible'}\n`);

      console.log('15. Checking extracted text content...');
      const extractedText = page.locator('pre').first();
      const extractedTextVisible = await extractedText.isVisible().catch(() => false);
      if (extractedTextVisible) {
        const textContent = await extractedText.textContent();
        console.log(`   ✅ Extracted text length: ${textContent?.length || 0} characters`);
        console.log(`   Preview: ${textContent?.substring(0, 100)}...\n`);
      } else {
        console.log(`   ❌ No extracted text visible\n`);
      }
    }

    console.log('\n========== CONSOLE LOGS SUMMARY ==========\n');
    const errorLogs = logs.filter(l => l.type === 'error');
    const warningLogs = logs.filter(l => l.type === 'warning');
    console.log(`Total logs: ${logs.length}`);
    console.log(`Errors: ${errorLogs.length}`);
    console.log(`Warnings: ${warningLogs.length}`);

    if (errorLogs.length > 0) {
      console.log('\n❌ ERRORS:');
      errorLogs.forEach(log => console.log(`   ${log.text}`));
    }

    console.log('\n\nKeeping browser open for 30 seconds for manual inspection...\n');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n========== ERROR ==========\n');
    console.error(error);
  } finally {
    await browser.close();
  }
})();

