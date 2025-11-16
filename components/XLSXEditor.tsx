/**
 * XLSX Editor component using react-spreadsheet
 * Displays template data in an editable spreadsheet format
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Spreadsheet from 'react-spreadsheet';
import { DownloadIcon } from './Icons';
import { exportToXLSX } from '../utils/xlsxUtils';

interface XLSXEditorProps {
  headers: string[];
  initialData: any[][]; // Full XLSX data including all rows
  filename: string;
  onDataChange?: (newData: any[][]) => void; // Optional callback when data changes
}

export const XLSXEditor: React.FC<XLSXEditorProps> = ({ headers, initialData, filename, onDataChange }) => {
  // Convert data to react-spreadsheet format
  // initialData already contains the header row and all data rows from the template
  const [data, setData] = useState(() => {
    return initialData.map(row =>
      row.map(cell => ({ value: cell ?? '' }))
    );
  });

  // Update internal state when initialData changes (e.g., when rows are added/removed)
  useEffect(() => {
    setData(initialData.map(row =>
      row.map(cell => ({ value: cell ?? '' }))
    ));
  }, [initialData]);

  // Handle data changes in the spreadsheet
  const handleDataChange = useCallback((newData: any) => {
    setData(newData);

    // Notify parent component if callback provided
    if (onDataChange) {
      const convertedData = newData.map((row: any[]) =>
        row.map((cell: any) => cell?.value ?? '')
      );
      onDataChange(convertedData);
    }
  }, [onDataChange]);

  const handleSaveAs = useCallback(() => {
    // Convert spreadsheet data back to array format
    const convertedData = data.slice(1).map(row =>
      row.map(cell => cell?.value || '')
    );

    const convertedHeaders = data[0].map(cell => cell?.value || '');

    // Create mapped data format for export
    const mappedData = convertedData.map(row => {
      const obj: any = {};
      convertedHeaders.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    // Export to XLSX
    exportToXLSX(mappedData, convertedHeaders, filename);
  }, [data, filename]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Edit Template Data
        </h3>
        <button
          onClick={handleSaveAs}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
          <DownloadIcon className="h-4 w-4" />
          Save As XLSX
        </button>
      </div>
      
      <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-auto max-h-[500px]">
        <Spreadsheet
          data={data}
          onChange={handleDataChange}
          className="react-spreadsheet"
        />
      </div>
      
      <p className="text-sm text-slate-600 dark:text-slate-400">
        💡 Click any cell to edit. Use Tab to move between cells. Changes are saved automatically.
      </p>
    </div>
  );
};

