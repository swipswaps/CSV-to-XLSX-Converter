/**
 * Utility functions for downloading files in the browser
 */

/**
 * Downloads a file to the user's device
 * @param content - The file content (string or Blob)
 * @param filename - The name of the file to download
 * @param mimeType - The MIME type of the file
 */
export const downloadFile = (
  content: string | Blob,
  filename: string,
  mimeType: string
): void => {
  // Create blob from content if it's a string
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content], { type: mimeType });
  
  // Create temporary download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Append to body, click, and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Release the object URL to free memory
  URL.revokeObjectURL(url);
};

/**
 * Downloads a CSV file
 * @param content - CSV content as string
 * @param filename - The name of the file (without extension)
 */
export const downloadCSV = (content: string, filename: string): void => {
  const csvFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  downloadFile(content, csvFilename, 'text/csv;charset=utf-8;');
};

/**
 * Downloads a JSON file
 * @param content - JSON content as string or object
 * @param filename - The name of the file (without extension)
 */
export const downloadJSON = (content: string | object, filename: string): void => {
  const jsonContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  const jsonFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
  downloadFile(jsonContent, jsonFilename, 'application/json;charset=utf-8;');
};

/**
 * Downloads a SQL file
 * @param content - SQL content as string
 * @param filename - The name of the file (without extension)
 */
export const downloadSQL = (content: string, filename: string): void => {
  const sqlFilename = filename.endsWith('.sql') ? filename : `${filename}.sql`;
  downloadFile(content, sqlFilename, 'text/plain;charset=utf-8;');
};

