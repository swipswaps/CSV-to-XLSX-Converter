import { chromium } from 'playwright';
import { readFileSync } from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Listen to console logs
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'log' || type === 'error' || type === 'warning') {
      console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
    }
  });

  // Listen to page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  console.log('1. Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('\n2. Checking if OCR tab exists...');
  const ocrTab = await page.locator('button:has-text("OCR Import")').first();
  const ocrTabVisible = await ocrTab.isVisible();
  console.log(`   OCR tab visible: ${ocrTabVisible ? '✅' : '❌'}`);

  if (ocrTabVisible) {
    console.log('\n3. Clicking OCR tab...');
    await ocrTab.click();
    await page.waitForTimeout(1000);

    console.log('\n4. Checking OCR tab content structure...');
    
    // Check for upload area
    const uploadArea = await page.locator('label[for="ocr-file-upload"]').first();
    const uploadVisible = await uploadArea.isVisible();
    console.log(`   Upload area visible: ${uploadVisible ? '✅' : '❌'}`);

    // Check for progress log container
    const progressLogHeader = await page.locator('h3:has-text("Processing Log")').first();
    const progressLogVisible = await progressLogHeader.isVisible().catch(() => false);
    console.log(`   Progress log header visible: ${progressLogVisible ? '✅' : '❌'}`);

    // Check for preprocessed images section
    const imagesHeader = await page.locator('h3:has-text("Preprocessed Images")').first();
    const imagesVisible = await imagesHeader.isVisible().catch(() => false);
    console.log(`   Preprocessed images header visible: ${imagesVisible ? '✅' : '❌'}`);

    // Check for extracted text section
    const textHeader = await page.locator('h3:has-text("Extracted Text Results")').first();
    const textVisible = await textHeader.isVisible().catch(() => false);
    console.log(`   Extracted text header visible: ${textVisible ? '✅' : '❌'}`);

    console.log('\n5. Using actual image from user...');
    // Use the image provided by user
    const testImagePath = './IMG_0371.jpg';

    console.log('\n6. Uploading image...');
    const fileInput = await page.locator('input#ocr-file-upload');
    await fileInput.setInputFiles(testImagePath);
    
    console.log('\n7. Waiting for file to be selected...');
    await page.waitForTimeout(2000);

    // Check if file appears in selected files
    const selectedFiles = await page.locator('text=/Selected Files/').first();
    const filesVisible = await selectedFiles.isVisible().catch(() => false);
    console.log(`   Selected files section visible: ${filesVisible ? '✅' : '❌'}`);

    if (filesVisible) {
      const fileCount = await page.locator('.aspect-square').count();
      console.log(`   Number of file thumbnails: ${fileCount}`);
    }

    // Check for process button
    const processButton = await page.locator('button:has-text("Extract Data from")').first();
    const processButtonVisible = await processButton.isVisible().catch(() => false);
    console.log(`   Process button visible: ${processButtonVisible ? '✅' : '❌'}`);

    if (processButtonVisible) {
      console.log('\n8. Clicking process button...');
      await processButton.click();
      
      console.log('\n9. Monitoring progress for 25 seconds...');
      let lastLogCount = 0;
      let lastImageCount = 0;

      for (let i = 1; i <= 25; i++) {
        await page.waitForTimeout(1000);

        // Count progress log entries - look for timestamp pattern
        const logEntries = await page.locator('div').filter({ hasText: /\[\d+:\d+:\d+/ }).count();

        // Count preprocessed images
        const imageCount = await page.locator('img').filter({ hasText: /Preprocessed/ }).count();

        // Only log when something changes
        if (logEntries !== lastLogCount || imageCount !== lastImageCount) {
          console.log(`   [${i}s] Progress logs: ${logEntries} | Preprocessed images: ${imageCount}`);

          // Get last log message if available
          if (logEntries > 0) {
            const lastLog = await page.locator('div').filter({ hasText: /\[\d+:\d+:\d+/ }).last().textContent();
            console.log(`         Last: ${lastLog?.substring(0, 100)}`);
          }

          lastLogCount = logEntries;
          lastImageCount = imageCount;
        }

        // Check if completed
        const completed = await page.locator('text=/OCR complete/').count();
        if (completed > 0) {
          console.log(`   [${i}s] ✅ Processing completed!`);
          break;
        }
      }

      console.log('\n10. Final state check...');
      const finalLogs = await page.locator('.bg-slate-900 > div').count();
      const finalImages = await page.locator('img[alt*="Preprocessed"]').count();
      const finalText = await page.locator('pre').textContent().catch(() => '');
      
      console.log(`   Total log entries: ${finalLogs}`);
      console.log(`   Preprocessed images: ${finalImages}`);
      console.log(`   Extracted text length: ${finalText.length} characters`);
    }
  }

  console.log('\n11. Keeping browser open for manual inspection...');
  console.log('    Press Ctrl+C to close when done.');
  
  // Keep browser open
  await page.waitForTimeout(300000); // 5 minutes

  await browser.close();
})();

