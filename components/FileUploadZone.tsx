/**
 * File upload zone component with drag and drop support
 */

import React, { useRef, useState, memo } from 'react';
import { UploadCloudIcon } from './Icons';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  accept: string;
  disabled?: boolean;
  label: string;
  description: string;
  isDragging: boolean;
  onDragStateChange: (isDragging: boolean) => void;
}

export const FileUploadZone = memo(({
  onFileSelect,
  accept,
  disabled = false,
  label,
  description,
  isDragging,
  onDragStateChange
}: FileUploadZoneProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, over: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      onDragStateChange(over);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-300 ${
        disabled
          ? 'cursor-not-allowed bg-slate-50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600'
          : isDragging
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 cursor-pointer'
      }`}
      onDragOver={(e) => handleDragEvents(e, true)}
      onDragLeave={(e) => handleDragEvents(e, false)}
      onDragEnter={(e) => handleDragEvents(e, true)}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <UploadCloudIcon className="mx-auto h-12 w-12 text-slate-400" />
      <p className="mt-4 text-slate-600 dark:text-slate-400">
        <span
          className={`font-semibold ${
            disabled
              ? 'text-slate-500'
              : 'text-indigo-600 dark:text-indigo-400 cursor-pointer'
          }`}
        >
          {label}
        </span>{' '}
        or drag and drop
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{description}</p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
});

FileUploadZone.displayName = 'FileUploadZone';

