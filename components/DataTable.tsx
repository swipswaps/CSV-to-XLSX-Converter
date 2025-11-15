/**
 * Virtualized data table component for efficient rendering of large datasets
 */

import React, { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { MappedDataRow } from '../utils/xlsxUtils';

interface DataTableProps {
  headers: string[];
  data: MappedDataRow[];
  onCellChange: (rowIndex: number, header: string, value: string) => void;
}

const ROW_HEIGHT = 42; // Height of each row in pixels
const HEADER_HEIGHT = 48; // Height of header in pixels
const OVERSCAN = 5; // Number of rows to render outside visible area

export const DataTable = memo(({ headers, data, onCellChange }: DataTableProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    container.addEventListener('scroll', handleScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleRows = Math.ceil(containerHeight / ROW_HEIGHT);
    const end = Math.min(data.length, start + visibleRows + OVERSCAN * 2);
    const offset = start * ROW_HEIGHT;

    return { startIndex: start, endIndex: end, offsetY: offset };
  }, [scrollTop, containerHeight, data.length]);

  const visibleData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  const totalHeight = (data?.length || 0) * ROW_HEIGHT;

  // Handle empty data case
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <p>No data to display</p>
      </div>
    );
  }

  const handleChange = useCallback(
    (localIndex: number, header: string, value: string) => {
      const actualIndex = startIndex + localIndex;
      onCellChange(actualIndex, header, value);
    },
    [startIndex, onCellChange]
  );

  return (
    <div
      ref={containerRef}
      className="overflow-auto max-h-[50vh] bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
      style={{ height: '50vh' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Sticky Header */}
        <div
          className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-700"
          style={{ height: HEADER_HEIGHT }}
        >
          <table className="min-w-full">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        {/* Virtual Rows */}
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          <table className="min-w-full bg-white dark:bg-slate-800">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {visibleData.map((row, localIndex) => (
                <tr
                  key={startIndex + localIndex}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  style={{ height: ROW_HEIGHT }}
                >
                  {headers.map((header) => (
                    <td key={header} className="px-1 py-0.5 whitespace-nowrap">
                      <input
                        type="text"
                        value={row[header] || ''}
                        onChange={(e) => handleChange(localIndex, header, e.target.value)}
                        className="w-full text-sm px-2 py-1.5 bg-transparent border border-transparent rounded-md transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-slate-50 dark:focus:bg-slate-700 dark:text-slate-200"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

DataTable.displayName = 'DataTable';

