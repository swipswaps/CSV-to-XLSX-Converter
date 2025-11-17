import { GoogleGenerativeAI } from '@google/generative-ai';

export interface OCRResult {
  success: boolean;
  data?: any[];
  error?: string;
}

export interface ImageData {
  mimeType: string;
  data: string; // base64
}

/**
 * Gemini OCR Service - Abstracts away API complexity
 * 
 * Usage:
 * 1. Get free API key from https://aistudio.google.com/app/apikey
 * 2. Store in localStorage or pass directly to extractDataFromImage()
 */
export class GeminiOCRService {
  private ai: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.setApiKey(apiKey);
  }

  /**
   * Set or update the API key
   */
  setApiKey(apiKey?: string): void {
    // Try to get API key from multiple sources
    this.apiKey = apiKey || 
                  localStorage.getItem('GEMINI_API_KEY') || 
                  import.meta.env.VITE_GEMINI_API_KEY || 
                  null;

    if (this.apiKey) {
      this.ai = new GoogleGenerativeAI(this.apiKey);
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get the current API key (masked for security)
   */
  getMaskedApiKey(): string | null {
    if (!this.apiKey) return null;
    return this.apiKey.substring(0, 8) + '...' + this.apiKey.substring(this.apiKey.length - 4);
  }

  /**
   * Extract structured data from an image using Gemini AI
   */
  async extractDataFromImage(image: ImageData): Promise<OCRResult> {
    if (!this.ai || !this.apiKey) {
      return {
        success: false,
        error: 'Gemini API key not configured. Please set your API key in the OCR settings.'
      };
    }

    try {
      const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are an expert data extraction AI. Analyze this image and extract structured data.

**Document Types:**
1. **Table**: Extract headers and rows → JSON array of objects
2. **Receipt**: Extract merchant, total, date, items → Single object in array
3. **List**: Extract repeating items → Array of objects with consistent keys
4. **Note**: Extract title, date, content → Single object in array
5. **Other**: General OCR → Single object with 'extracted_text' key

**Rules:**
- ALWAYS return valid JSON array
- If no data found, return empty array []
- Don't invent data - use null for missing values
- Clean text: trim whitespace, fix obvious OCR errors
- Ignore watermarks and background text

**Example Table Output:**
[{"ItemID": "A1", "Product": "Widget", "Price": "10.00"}, {"ItemID": "A2", "Product": "Gadget", "Price": "15.00"}]

**Example Receipt Output:**
[{"merchant_name": "Store", "total_amount": "25.50", "transaction_date": "2024-01-15", "items": [{"description": "Item", "price": "25.50"}]}]
`;

      const imagePart = {
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Clean markdown code blocks if present
      const cleanedText = text.replace(/^```json\s*|```\s*$/g, '').trim();

      if (!cleanedText) {
        return {
          success: true,
          data: []
        };
      }

      const parsedData = JSON.parse(cleanedText);

      // Ensure we have an array
      let dataArray: any[];
      if (!Array.isArray(parsedData)) {
        if (typeof parsedData === 'object' && parsedData !== null) {
          dataArray = [parsedData];
        } else {
          throw new Error('API did not return valid JSON array or object');
        }
      } else {
        dataArray = parsedData;
      }

      // Filter out empty objects
      const filteredData = dataArray.filter(row => Object.keys(row).length > 0);

      return {
        success: true,
        data: filteredData
      };

    } catch (error: any) {
      console.error('Gemini API Error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to extract data from image.';
      
      if (error.message?.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your Gemini API key.';
      } else if (error.message?.includes('quota')) {
        errorMessage = 'API quota exceeded. Please check your Gemini API usage limits.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error instanceof SyntaxError) {
        errorMessage = 'Failed to parse AI response. The image may not contain structured data.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiOCRService();

