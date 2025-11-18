import { createWorker, Worker } from 'tesseract.js';

export interface OCRResult {
  success: boolean;
  data?: any[];
  error?: string;
  rawText?: string;
}

export interface ImageData {
  mimeType: string;
  data: string; // base64
  processedDataUrl?: string; // preprocessed image data URL
}

/**
 * Tesseract OCR Service - Works completely offline, no API key needed!
 * 
 * Features:
 * - 100% browser-based OCR
 * - No API keys or internet required
 * - Supports 100+ languages
 * - Free and open source
 */
export class TesseractOCRService {
  private worker: Worker | null = null;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize Tesseract worker
   * No API key needed - works completely offline!
   */
  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized && this.worker) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = (async () => {
      try {
        this.worker = await createWorker('eng', 1, {
          logger: (m) => {
            // Optional: log progress
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });

        // Configure Tesseract for better accuracy
        // PSM 3 = Fully automatic page segmentation (best for mixed content)
        // OEM 1 = Neural nets LSTM engine only (best accuracy)
        await this.worker.setParameters({
          tessedit_pageseg_mode: '3',  // Fully automatic page segmentation
          tessedit_ocr_engine_mode: '1', // LSTM neural net (best accuracy)
          tessedit_char_whitelist: '', // Allow all characters
          preserve_interword_spaces: '1', // Preserve spaces between words
        });

        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize Tesseract:', error);
        this.initPromise = null;
        throw new Error('Failed to initialize OCR engine');
      }
    })();

    return this.initPromise;
  }

  /**
   * Check if the service is ready to use
   */
  isConfigured(): boolean {
    return true; // Always configured - no API key needed!
  }

  /**
   * No API key needed for Tesseract
   */
  getMaskedApiKey(): string | null {
    return null;
  }

  /**
   * Parse OCR text into structured data
   */
  private parseTextToStructuredData(text: string): any[] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length === 0) {
      return [];
    }

    // Try to detect if it's a table (has consistent delimiters)
    const hasTabDelimiters = lines.some(l => l.includes('\t'));
    const hasPipeDelimiters = lines.some(l => l.includes('|'));
    const hasCommaDelimiters = lines.some(l => l.includes(','));

    if (hasTabDelimiters || hasPipeDelimiters || hasCommaDelimiters) {
      return this.parseTableData(lines, hasTabDelimiters ? '\t' : hasPipeDelimiters ? '|' : ',');
    }

    // Try to detect key-value pairs (receipts, forms)
    const hasColons = lines.filter(l => l.includes(':')).length > lines.length / 2;
    if (hasColons) {
      return this.parseKeyValueData(lines);
    }

    // Default: treat as simple list
    return this.parseListData(lines);
  }

  /**
   * Parse table-like data with delimiters
   */
  private parseTableData(lines: string[], delimiter: string): any[] {
    const rows = lines.map(line => 
      line.split(delimiter)
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0 && cell !== '|')
    ).filter(row => row.length > 0);

    if (rows.length < 2) {
      return this.parseListData(lines);
    }

    // First row is headers
    const headers = rows[0];
    const data = rows.slice(1);

    return data.map(row => {
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });
  }

  /**
   * Parse key-value pairs (receipts, forms)
   */
  private parseKeyValueData(lines: string[]): any[] {
    const obj: any = {};
    
    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        obj[key] = value;
      }
    });

    return Object.keys(obj).length > 0 ? [obj] : [];
  }

  /**
   * Parse simple list data
   */
  private parseListData(lines: string[]): any[] {
    // Check if lines look like numbered/bulleted list
    const listPattern = /^[\d\-\*\•]\s*(.+)/;

    return lines.map((line, index) => {
      const match = line.match(listPattern);
      const text = match ? match[1] : line;
      return {
        'Item': text,
        'Line': index + 1
      };
    });
  }

  /**
   * Extract structured data from an image using Tesseract OCR
   */
  async extractDataFromImage(image: ImageData): Promise<OCRResult> {
    try {
      // Initialize if not already done
      await this.initialize();

      if (!this.worker) {
        return {
          success: false,
          error: 'OCR engine not initialized'
        };
      }

      // Use preprocessed image if available (better accuracy), otherwise use original
      const imageUrl = image.processedDataUrl || `data:${image.mimeType};base64,${image.data}`;

      // Perform OCR with optimized settings
      console.log('Starting OCR recognition...');
      const { data: { text } } = await this.worker.recognize(imageUrl);
      console.log('OCR completed. Extracted text length:', text?.length || 0);

      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'No text found in image. The image may be blank or too low quality.'
        };
      }

      // Parse text into structured data
      const structuredData = this.parseTextToStructuredData(text);

      if (structuredData.length === 0) {
        return {
          success: false,
          error: 'Could not parse text into structured data. Try a clearer image.'
        };
      }

      return {
        success: true,
        data: structuredData,
        rawText: text
      };

    } catch (error: any) {
      console.error('Tesseract OCR Error:', error);

      let errorMessage = 'Failed to extract data from image.';

      if (error.message?.includes('initialize')) {
        errorMessage = 'Failed to initialize OCR engine. Please try again.';
      } else if (error.message?.includes('recognize')) {
        errorMessage = 'Failed to recognize text. Try a clearer, higher-contrast image.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Terminate the worker to free up resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const tesseractService = new TesseractOCRService();

