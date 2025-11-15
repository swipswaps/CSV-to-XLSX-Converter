/**
 * File utility functions for reading and processing files
 */

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const LARGE_FILE_WARNING_SIZE = 10 * 1024 * 1024; // 10MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Read file as ArrayBuffer with proper error handling
 */
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result instanceof ArrayBuffer) {
        resolve(event.target.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Error reading file: ${reader.error?.message || 'Unknown error'}`));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Read file as text with UTF-8 encoding
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        resolve(event.target.result);
      } else {
        reject(new Error('Failed to read file as text.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Error reading file: ${reader.error?.message || 'Unknown error'}`));
    };
    
    // Explicitly read as UTF-8 to handle special characters and emojis correctly
    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * Validate XLSX template file
 */
export const validateTemplateFile = (file: File): FileValidationResult => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}.`
    };
  }
  
  if (!file.type.includes('spreadsheetml') && !file.name.endsWith('.xlsx')) {
    return {
      valid: false,
      error: 'Invalid template file type. Please upload a .xlsx file.'
    };
  }
  
  const warning = file.size > LARGE_FILE_WARNING_SIZE 
    ? `Large file detected (${formatFileSize(file.size)}). Processing may take longer.`
    : undefined;
  
  return { valid: true, warning };
};

/**
 * Validate CSV data file
 */
export const validateDataFile = (file: File): FileValidationResult => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}.`
    };
  }
  
  if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
    return {
      valid: false,
      error: 'Invalid data file type. Please upload a .csv file.'
    };
  }
  
  const warning = file.size > LARGE_FILE_WARNING_SIZE 
    ? `Large file detected (${formatFileSize(file.size)}). Processing may take longer.`
    : undefined;
  
  return { valid: true, warning };
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Clean mojibake (encoding issues) from strings
 */
export const cleanMojibake = (str: string): string => {
  if (typeof str !== 'string') return str;

  // Enhanced cleanup for common UTF-8 -> Windows-1252/Latin-1 issues
  return str
    .replace(/â€"/g, '\u2014')  // em dash
    .replace(/â€"/g, '\u2013')  // en dash
    .replace(/â€™/g, '\u2019')  // right single quote
    .replace(/â€˜/g, '\u2018')  // left single quote
    .replace(/â€œ/g, '\u201C')  // left double quote
    .replace(/â€/g, '\u201D')   // right double quote
    .replace(/â€¦/g, '\u2026')  // ellipsis
    .replace(/Â¢/g, '\u00A2')   // cent sign
    .replace(/ðŸ"¥/g, '\uD83D\uDD25'); // fire emoji
};

