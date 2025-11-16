/**
 * JSON Editor component
 * Displays template data in JSON format with editing and download
 */

import React, { useState, useCallback, useEffect } from 'react';
import { DownloadIcon } from './Icons';

interface JSONEditorProps {
  headers: string[];
  data: any[][];
  filename: string;
}

export const JSONEditor: React.FC<JSONEditorProps> = ({ headers, data, filename }) => {
  const [editableJSON, setEditableJSON] = useState<string>('');

  // Convert data to JSON format
  useEffect(() => {
    if (data.length === 0 || headers.length === 0) return;

    // Find header row index
    const headerRowIndex = data.findIndex(row => 
      row.some(cell => headers.includes(String(cell ?? '')))
    );

    if (headerRowIndex === -1) return;

    // Convert rows to JSON objects
    const jsonData = data.slice(headerRowIndex + 1).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] ?? '';
      });
      return obj;
    }).filter(obj => Object.values(obj).some(val => val !== '')); // Remove empty rows

    setEditableJSON(JSON.stringify(jsonData, null, 2));
  }, [headers, data]);

  const handleDownload = useCallback(() => {
    if (!editableJSON) return;
    
    const blob = new Blob([editableJSON], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename.replace(/\.(xlsx|csv)$/i, '.json'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [editableJSON, filename]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Edit JSON Data
        </h3>
        <button
          onClick={handleDownload}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
          <DownloadIcon className="h-4 w-4" />
          Download JSON
        </button>
      </div>
      
      <textarea
        value={editableJSON}
        onChange={(e) => setEditableJSON(e.target.value)}
        className="w-full h-64 font-mono text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-3 rounded border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="JSON data will appear here..."
      />
      
      <p className="text-sm text-slate-600 dark:text-slate-400">
        💡 Edit the JSON content directly. Make sure to maintain valid JSON syntax.
      </p>
    </div>
  );
};

