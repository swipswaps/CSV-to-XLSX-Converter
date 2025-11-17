/**
 * XLSX Editor component using react-spreadsheet
 * Displays template data in an editable spreadsheet format
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Spreadsheet from 'react-spreadsheet';
import { DownloadIcon, TrashIcon, CopyIcon, MoreVerticalIcon } from './Icons';
import { exportToXLSX } from '../utils/xlsxUtils';
import toast from 'react-hot-toast';

interface XLSXEditorProps {
  headers: string[];
  initialData: any[][]; // Full XLSX data including all rows
  filename: string;
  onDataChange?: (newData: any[][]) => void; // Optional callback when data changes
  onDeleteRow?: (rowIndex: number) => void; // Optional callback to delete a specific row
  onDuplicateRow?: (rowIndex: number) => void; // Optional callback to duplicate a specific row
}

// Custom RowIndicator component with dropdown menu for row actions
interface CustomRowIndicatorProps {
  row: number;
  label?: React.ReactNode | null;
  selected: boolean;
  onSelect: (row: number, extend: boolean) => void;
  onDuplicate?: (row: number) => void;
  onDelete?: (row: number) => void;
}

const CustomRowIndicator: React.FC<CustomRowIndicatorProps> = ({
  row,
  label,
  selected,
  onSelect,
  onDuplicate,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    onSelect(row, event.shiftKey);
  }, [onSelect, row]);

  const handleMenuClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShowMenu(!showMenu);
  }, [showMenu]);

  const handleDuplicate = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setShowMenu(false);
    if (onDuplicate && row > 0) {
      onDuplicate(row);
      toast.success(`Row ${row} duplicated!`, { icon: '📋', duration: 2000 });
    }
  }, [onDuplicate, row]);

  const handleDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setShowMenu(false);
    if (onDelete && row > 0) {
      onDelete(row);
      toast.success(`Row ${row} deleted!`, { icon: '🗑️', duration: 2000 });
    }
  }, [onDelete, row]);

  const shouldShowMenu = row > 0 && !!(onDuplicate || onDelete);

  return (
    <th
      className={`Spreadsheet__header ${selected ? 'Spreadsheet__header--selected' : ''} relative group`}
      onClick={handleClick}
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-1">
        <span>{label !== undefined ? label : row + 1}</span>
        {shouldShowMenu && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-600 rounded p-0.5 transition-opacity"
              title="Row actions"
            >
              <MoreVerticalIcon className="h-3 w-3" />
            </button>
            {showMenu && (
              <div className="absolute left-full top-0 ml-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-50 min-w-[120px]">
                {onDuplicate && (
                  <button
                    onClick={handleDuplicate}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 rounded-t-lg"
                  >
                    <CopyIcon className="h-3 w-3" />
                    Duplicate
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 rounded-b-lg"
                  >
                    <TrashIcon className="h-3 w-3" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
};

export const XLSXEditor: React.FC<XLSXEditorProps> = ({
  headers,
  initialData,
  filename,
  onDataChange,
  onDeleteRow,
  onDuplicateRow
}) => {
  // Convert data to react-spreadsheet format
  // initialData already contains the header row and all data rows from the template
  const [data, setData] = useState(() => {
    return initialData.map(row =>
      row.map(cell => ({ value: cell ?? '' }))
    );
  });

  // Track selected cells/rows (PointRange format)
  const [selected, setSelected] = useState<{ start: { row: number; column: number }; end: { row: number; column: number } } | null>(null);

  // Keep a ref to the selected state to avoid race conditions when buttons are clicked
  const selectedRef = useRef<{ start: { row: number; column: number }; end: { row: number; column: number } } | null>(null);

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

  // Handle selection changes
  const handleSelect = useCallback((selection: any) => {
    // Check if it's an EntireColumnsSelection (user clicked column header by mistake)
    if (selection?.constructor?.name === 'EntireColumnsSelection' || selection?.constructor?.name === 'EntireColumnsSelection2') {
      setSelected(null);
      selectedRef.current = null;
      return;
    }

    // Handle EntireRowsSelection specially - convert to full row range
    if (selection?.constructor?.name === 'EntireRowsSelection' || selection?.constructor?.name === 'EntireRowsSelection2') {
      // For EntireRowsSelection, start and end are row indices
      const rowIndex = selection.start; // Assuming single row selection
      const selectedRange = {
        start: { row: rowIndex, column: 0 },
        end: { row: rowIndex, column: data[0].length - 1 }
      };
      selectedRef.current = selectedRange;
      setSelected(selectedRange);
      return;
    }

    // Convert Selection object to PointRange
    if (selection && typeof selection.toRange === 'function') {
      const range = selection.toRange(data);

      if (range && range.start && range.end) {
        const selectedRange = {
          start: { row: range.start.row, column: range.start.column },
          end: { row: range.end.row, column: range.end.column }
        };
        selectedRef.current = selectedRange;
        setSelected(selectedRange);
      } else {
        selectedRef.current = null;
        setSelected(null);
      }
    } else {
      selectedRef.current = null;
      setSelected(null);
    }
  }, [data]);

  // Delete selected row
  const handleDeleteSelectedRow = useCallback(() => {
    // Use ref to avoid race condition when button click clears selection
    const currentSelection = selectedRef.current;

    if (!currentSelection || !currentSelection.start) {
      toast.error('Please select a row to delete');
      return;
    }

    const rowIndex = currentSelection.start.row;

    // Don't allow deleting the header row
    if (rowIndex === 0) {
      toast.error('Cannot delete header row');
      return;
    }

    if (onDeleteRow) {
      onDeleteRow(rowIndex);
      toast.success(`Row ${rowIndex} deleted!`, { icon: '🗑️', duration: 2000 });
      selectedRef.current = null;
      setSelected(null);
    }
  }, [onDeleteRow]);

  // Duplicate selected row or cells
  const handleDuplicateSelection = useCallback(() => {
    // Use ref to avoid race condition when button click clears selection
    const currentSelection = selectedRef.current;

    if (!currentSelection || !currentSelection.start || !currentSelection.end) {
      toast.error('Please select cells or a row to duplicate');
      return;
    }

    const { start, end } = currentSelection;

    // Don't allow duplicating the header row
    if (start.row === 0) {
      toast.error('Cannot duplicate header row');
      return;
    }

    // SIMPLIFIED: If all selected cells are in the same row, duplicate the row
    const isSingleRow = start.row === end.row;

    if (isSingleRow) {
      if (onDuplicateRow) {
        onDuplicateRow(start.row);
        toast.success(`Row ${start.row} duplicated!`, { icon: '📋', duration: 2000 });
      }
    } else {
      // Copy selected cells to clipboard (multi-row selection)
      const selectedData: string[][] = [];
      for (let row = start.row; row <= end.row; row++) {
        const rowData: string[] = [];
        for (let col = start.column; col <= end.column; col++) {
          rowData.push(data[row][col]?.value ?? '');
        }
        selectedData.push(rowData);
      }

      // Convert to tab-separated values for clipboard
      const clipboardText = selectedData.map(row => row.join('\t')).join('\n');
      navigator.clipboard.writeText(clipboardText);
      toast.success('Cells copied to clipboard!', { icon: '📋', duration: 2000 });
    }
  }, [data, onDuplicateRow]);

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

  // Get selected row info for display
  const selectedRowInfo = useMemo(() => {
    if (!selected || !selected.start || !selected.end) return null;
    const rowIndex = selected.start.row;

    // SIMPLIFIED: Accept any selection where all cells are in the same row
    // This makes it much easier for users to duplicate/delete rows
    const isSingleRow = selected.start.row === selected.end.row;

    return { rowIndex, isFullRow: isSingleRow };
  }, [selected, data]);

  // Create memoized RowIndicator component with row actions
  const RowIndicatorWithActions = useCallback((props: any) => (
    <CustomRowIndicator
      {...props}
      onDuplicate={onDuplicateRow}
      onDelete={onDeleteRow}
    />
  ), [onDuplicateRow, onDeleteRow]);

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

      {/* Row Actions */}
      {selected && selected.start && selected.end && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
            {selectedRowInfo?.isFullRow ? (
              <span>
                <strong>Row {selectedRowInfo.rowIndex}</strong> selected
              </span>
            ) : (
              <span>
                <strong>Cells</strong> selected ({selected.start.row},{selected.start.column}) to ({selected.end.row},{selected.end.column})
              </span>
            )}
          </div>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleDuplicateSelection();
            }}
            disabled={selected.start.row === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
            title={selectedRowInfo?.isFullRow ? "Duplicate selected row" : "Copy selected cells to clipboard"}
          >
            <CopyIcon className="h-4 w-4" />
            {selectedRowInfo?.isFullRow ? 'Duplicate Row' : 'Copy Cells'}
          </button>
          {selectedRowInfo?.isFullRow && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleDeleteSelectedRow();
              }}
              disabled={selected.start.row === 0}
              className="bg-red-600 hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
              title="Delete selected row"
            >
              <TrashIcon className="h-4 w-4" />
              Delete Row
            </button>
          )}
        </div>
      )}

      <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-auto max-h-[500px]">
        <Spreadsheet
          data={data}
          onChange={handleDataChange}
          onSelect={handleSelect}
          RowIndicator={RowIndicatorWithActions}
          className="react-spreadsheet"
        />
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        💡 <strong>Click</strong> any cell to edit. <strong>Hover over row number</strong> and click ⋮ menu for duplicate/delete actions.
        <strong> Select cells in a row</strong> to use Duplicate Row button above. <strong>Shift+Click</strong> to select multiple cells. <strong>Ctrl+C</strong> to copy.
        Changes are saved automatically.
      </p>
    </div>
  );
};

