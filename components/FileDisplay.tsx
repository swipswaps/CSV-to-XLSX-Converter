/**
 * File display component showing file info with remove button
 */

import React, { memo } from 'react';
import { XCircleIcon } from './Icons';
import { formatFileSize } from '../utils/fileUtils';

interface FileDisplayProps {
  file: File;
  onRemove: () => void;
  icon: React.ReactNode;
  warning?: string;
}

export const FileDisplay = memo(({ file, onRemove, icon, warning }: FileDisplayProps) => (
  <div className="space-y-2">
    <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          {icon}
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {file.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0 ml-2"
          aria-label="Remove file"
        >
          <XCircleIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
    {warning && (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">{warning}</p>
      </div>
    )}
  </div>
));

FileDisplay.displayName = 'FileDisplay';

