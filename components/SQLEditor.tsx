/**
 * SQL Editor component
 * Displays template data as SQL INSERT statements with editing and download
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DownloadIcon } from './Icons';
import { downloadSQL } from '../utils/downloadUtils';

interface SQLEditorProps {
  headers: string[];
  data: any[][];
  filename: string;
  tableName?: string;
  headerRowIndex?: number;
}

export const SQLEditor: React.FC<SQLEditorProps> = ({
  headers,
  data,
  filename,
  tableName = 'products',
  headerRowIndex: providedHeaderRowIndex
}) => {
  const [editableSQL, setEditableSQL] = useState<string>('');

  // Memoize sanitized column names to avoid redundant regex operations
  const sanitizedColumns = useMemo(() =>
    headers.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_')),
    [headers]
  );

  // Memoize column names string for INSERT statements
  const columnNamesStr = useMemo(() =>
    sanitizedColumns.join(', '),
    [sanitizedColumns]
  );

  // Convert data to SQL INSERT statements
  useEffect(() => {
    if (data.length === 0 || headers.length === 0) return;

    // Use provided headerRowIndex or find it
    const headerRowIndex = providedHeaderRowIndex ?? data.findIndex(row =>
      row.some(cell => headers.includes(String(cell ?? '')))
    );

    if (headerRowIndex === -1) return;

    // Escape SQL values
    const escapeSQLValue = (value: any): string => {
      if (value === null || value === undefined || value === '') {
        return 'NULL';
      }
      const strValue = String(value);
      // Escape single quotes by doubling them
      const escaped = strValue.replace(/'/g, "''");
      return `'${escaped}'`;
    };

    // Generate CREATE TABLE statement using memoized columns
    const createTable = `-- Create table\nCREATE TABLE IF NOT EXISTS ${tableName} (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n${sanitizedColumns.map(col => `  ${col} VARCHAR(255)`).join(',\n')}\n);\n\n`;

    // Generate INSERT statements
    const dataRows = data.slice(headerRowIndex + 1).filter(row =>
      row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );

    const insertStatements = dataRows.map(row => {
      const values = row.map(escapeSQLValue).join(', ');
      return `INSERT INTO ${tableName} (${columnNamesStr}) VALUES (${values});`;
    }).join('\n');

    const sqlContent = createTable + '-- Insert data\n' + insertStatements;
    setEditableSQL(sqlContent);
  }, [headers, data, tableName, providedHeaderRowIndex, sanitizedColumns, columnNamesStr]);

  const handleDownload = useCallback(() => {
    if (!editableSQL) return;
    const sqlFilename = filename.replace(/\.(xlsx|csv)$/i, '');
    downloadSQL(editableSQL, sqlFilename);
  }, [editableSQL, filename]);

  // Calculate data statistics
  const dataRowCount = useMemo(() => {
    const headerIdx = providedHeaderRowIndex ?? data.findIndex(row =>
      row.some(cell => headers.includes(String(cell ?? '')))
    );
    if (headerIdx === -1) return 0;
    return data.slice(headerIdx + 1).filter(row =>
      row.some(cell => cell !== null && cell !== undefined && cell !== '')
    ).length;
  }, [data, headers, providedHeaderRowIndex]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Edit SQL Statements
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            📊 {dataRowCount} rows × {headers.length} columns
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
          <DownloadIcon className="h-4 w-4" />
          Download SQL
        </button>
      </div>
      
      <textarea
        value={editableSQL}
        onChange={(e) => setEditableSQL(e.target.value)}
        className="w-full h-64 font-mono text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-3 rounded border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
        placeholder="SQL statements will appear here..."
      />
      
      <p className="text-sm text-slate-600 dark:text-slate-400">
        💡 Edit the SQL statements directly. Includes CREATE TABLE and INSERT statements.
      </p>
    </div>
  );
};

