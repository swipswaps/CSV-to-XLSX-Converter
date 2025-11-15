/**
 * XLSX processing utilities
 */

import { readFileAsArrayBuffer, readFileAsText, cleanMojibake } from './fileUtils';

// Declare global XLSX from CDN
declare const XLSX: any;

export interface TemplateProcessResult {
  headers: string[];
  headerRowIndex: number;
}

export interface MappedDataRow {
  [key: string]: any;
}

/**
 * Process XLSX template file and extract headers
 */
export const processTemplate = async (file: File): Promise<TemplateProcessResult> => {
  const bufferArray = await readFileAsArrayBuffer(file);
  const wb = XLSX.read(bufferArray, { type: 'buffer', cellDates: true });
  const wsname = wb.SheetNames[0];
  const ws = wb.Sheets[wsname];
  
  // Scan first 10 rows for header detection (expanded range to include more columns)
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let headerRowIndex = -1;
  let headers: string[] = [];

  // Intelligent header detection - look for common required headers
  // Only scan first 10 rows to avoid processing too much data
  const rowsToScan = Math.min(10, data.length);
  for (let i = 0; i < rowsToScan; i++) {
    const row = data[i] as any[];
    if (!row || row.length === 0) continue;

    const normalizedRow = row.map(h => String(h || '').trim().toUpperCase());

    // Look for a row with common required headers
    if (normalizedRow.includes('TITLE') && normalizedRow.includes('PRICE') && normalizedRow.includes('CONDITION')) {
      headerRowIndex = i;
      headers = row.map(h => String(h || '').trim()).filter(h => h);
      break;
    }
  }

  if (headerRowIndex === -1 || headers.length === 0) {
    throw new Error(
      "Could not automatically detect a valid header row. Ensure your template contains 'TITLE', 'PRICE', and 'CONDITION' columns."
    );
  }

  return { headers, headerRowIndex };
};

/**
 * Parse CSV text manually to handle quoted fields correctly
 */
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n in \r\n
      }
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }

  // Add last field and row if any
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
};

/**
 * Process CSV data file and map to template headers
 */
export const processCSVData = async (
  dataFile: File,
  templateHeaders: string[],
  shouldCleanCharacters: boolean
): Promise<MappedDataRow[]> => {
  // Read CSV as text with UTF-8 encoding
  const text = await readFileAsText(dataFile);

  // Parse CSV manually to handle quoted fields correctly
  const rows = parseCSV(text);

  if (rows.length === 0) {
    throw new Error('CSV data file is empty or could not be parsed.');
  }

  // First row is headers
  const csvHeaders = rows[0].map(h => h.trim());
  const dataRows = rows.slice(1);

  // Create header mapping (case-insensitive)
  const csvHeaderMap = csvHeaders.reduce((acc, header, index) => {
    acc[header.toLowerCase().trim()] = index;
    return acc;
  }, {} as Record<string, number>);

  // Map CSV data to template structure
  let mapped = dataRows.map(row => {
    const newRow: MappedDataRow = {};
    templateHeaders.forEach(templateHeader => {
      const csvHeaderKey = templateHeader.toLowerCase().trim();
      const columnIndex = csvHeaderMap[csvHeaderKey];

      if (columnIndex !== undefined && row[columnIndex] !== undefined) {
        newRow[templateHeader] = row[columnIndex].trim();
      } else {
        newRow[templateHeader] = '';
      }
    });
    return newRow;
  });

  // Clean mojibake if enabled
  if (shouldCleanCharacters) {
    mapped.forEach(row => {
      for (const key in row) {
        if (typeof row[key] === 'string') {
          row[key] = cleanMojibake(row[key]);
        }
      }
    });
  }

  return mapped;
};

/**
 * Export mapped data to XLSX file
 */
export const exportToXLSX = (
  mappedData: MappedDataRow[],
  templateHeaders: string[],
  originalFileName: string
): void => {
  const worksheet = XLSX.utils.json_to_sheet(mappedData, { header: templateHeaders });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mapped Data');
  
  const outputFilename = originalFileName.replace(/\.csv$/i, '_mapped.xlsx');
  XLSX.writeFile(workbook, outputFilename);
};

