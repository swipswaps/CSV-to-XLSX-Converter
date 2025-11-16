import React, { useState, useMemo } from 'react';

interface FacebookPreviewProps {
  templateData: any[][];
  headerRowIndex: number;
  mappedData: any[][];
  onSaveToTemplateData?: (rowIndex: number, updatedRow: any[]) => void;
  onSaveToMappedData?: (rowIndex: number, updatedRow: any[]) => void;
}

export const FacebookPreview: React.FC<FacebookPreviewProps> = ({
  templateData,
  headerRowIndex,
  mappedData,
  onSaveToTemplateData,
  onSaveToMappedData,
}) => {
  // State for selected data source
  const [dataSource, setDataSource] = useState<'template' | 'mapped'>('template');

  // State for selected row index
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);

  // State for editable post content
  const [postContent, setPostContent] = useState<string>('');

  // State for original content (for revert)
  const [originalContent, setOriginalContent] = useState<string>('');

  // Get the active data based on source selection
  const activeData = dataSource === 'template' ? templateData : mappedData;
  
  // Get headers
  const headers = useMemo(() => {
    if (activeData.length === 0) return [];
    return activeData[headerRowIndex] || [];
  }, [activeData, headerRowIndex]);
  
  // Get data rows (excluding header)
  const dataRows = useMemo(() => {
    if (activeData.length === 0) return [];
    return activeData.slice(headerRowIndex + 1);
  }, [activeData, headerRowIndex]);
  
  // Get selected row data
  const selectedRow = useMemo(() => {
    if (dataRows.length === 0 || selectedRowIndex >= dataRows.length) return null;
    return dataRows[selectedRowIndex];
  }, [dataRows, selectedRowIndex]);
  
  // Format row data as text for post
  const formattedRowData = useMemo(() => {
    if (!selectedRow || headers.length === 0) return '';
    
    return headers
      .map((header, index) => {
        const value = selectedRow[index] || '';
        return `${header}: ${value}`;
      })
      .join('\n');
  }, [selectedRow, headers]);
  
  // Update post content when row selection changes
  React.useEffect(() => {
    setPostContent(formattedRowData);
    setOriginalContent(formattedRowData);
  }, [formattedRowData]);

  // Character count
  const characterCount = postContent.length;
  const maxCharacters = 63206; // Facebook's actual limit

  // Parse post content back to row data
  const parsePostContentToRow = (content: string): any[] => {
    const lines = content.split('\n');
    const updatedRow = [...(selectedRow || [])];

    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const header = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      const headerIndex = headers.indexOf(header);
      if (headerIndex !== -1) {
        updatedRow[headerIndex] = value;
      }
    });

    return updatedRow;
  };

  // Save changes across all tabs
  const handleSaveAcrossTabs = () => {
    if (!selectedRow) return;

    const updatedRow = parsePostContentToRow(postContent);
    const actualRowIndex = headerRowIndex + 1 + selectedRowIndex;

    if (dataSource === 'template' && onSaveToTemplateData) {
      onSaveToTemplateData(actualRowIndex, updatedRow);
    } else if (dataSource === 'mapped' && onSaveToMappedData) {
      onSaveToMappedData(selectedRowIndex, updatedRow);
    }

    // Update original content to current (so revert works correctly)
    setOriginalContent(postContent);

    alert('✅ Changes saved across all tabs!');
  };

  // Revert to previous content
  const handleRevertToPrevious = () => {
    setPostContent(originalContent);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          📘 Facebook Post Preview
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Select a row from your data and preview it as a Facebook post. Edit the content before posting.
        </p>
      </div>
      
      {/* Data Source Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Data Source
        </label>
        <select
          value={dataSource}
          onChange={(e) => setDataSource(e.target.value as 'template' | 'mapped')}
          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="template">Template Data ({templateData.length - headerRowIndex - 1} rows)</option>
          <option value="mapped">Mapped Data ({mappedData.length - headerRowIndex - 1} rows)</option>
        </select>
      </div>
      
      {/* Row Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Select Row to Preview ({dataRows.length} rows available)
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="0"
            max={Math.max(0, dataRows.length - 1)}
            value={selectedRowIndex}
            onChange={(e) => setSelectedRowIndex(parseInt(e.target.value))}
            className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[80px] text-right">
            Row {selectedRowIndex + 1} of {dataRows.length}
          </span>
        </div>
        
        {/* Quick row selector dropdown */}
        <select
          value={selectedRowIndex}
          onChange={(e) => setSelectedRowIndex(parseInt(e.target.value))}
          className="w-full mt-3 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        >
          {dataRows.map((row, index) => (
            <option key={index} value={index}>
              Row {index + 1}: {row.slice(0, 3).join(' | ')}...
            </option>
          ))}
        </select>
      </div>
      
      {/* Facebook Post Preview */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Facebook Post Preview
          </h4>
        </div>
        
        {/* Facebook Post Card */}
        <div className="bg-white dark:bg-slate-900">
          {/* Post Header - Facebook style */}
          <div className="p-3 flex items-center space-x-3">
            {/* Profile Picture */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              U
            </div>
            
            {/* User Info */}
            <div className="flex-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Your Business Name
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <span>Just now</span>
                <span>·</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.5 7.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/>
                </svg>
              </div>
            </div>
            
            {/* More Options */}
            <button className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5"/>
                <circle cx="8" cy="8" r="1.5"/>
                <circle cx="8" cy="13" r="1.5"/>
              </svg>
            </button>
          </div>
          
          {/* Post Content - Editable */}
          <div className="px-4 pb-3">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full min-h-[200px] p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What's on your mind?"
            />
            <div className="mt-2 flex justify-between items-center text-xs">
              <span className={`${characterCount > maxCharacters ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'}`}>
                {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()} characters
              </span>
              {characterCount > maxCharacters && (
                <span className="text-red-600 font-medium">Character limit exceeded!</span>
              )}
            </div>
          </div>

          {/* Post Actions - Facebook style */}
          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2">
            <div className="flex items-center justify-around">
              {/* Like */}
              <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <span className="text-sm font-medium">Like</span>
              </button>

              {/* Comment */}
              <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm font-medium">Comment</span>
              </button>

              {/* Share */}
              <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-sm font-medium">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Save Across All Tabs - Primary Action */}
        <button
          onClick={handleSaveAcrossTabs}
          disabled={!selectedRow || postContent === originalContent}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>Save Across All Tabs</span>
        </button>

        {/* Revert to Previous */}
        <button
          onClick={handleRevertToPrevious}
          disabled={!selectedRow || postContent === originalContent}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>Revert to Previous</span>
        </button>

        {/* Copy to Clipboard */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(postContent);
            alert('Post content copied to clipboard!');
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy to Clipboard</span>
        </button>

        {/* Reset to Original Row Data */}
        <button
          onClick={() => setPostContent(formattedRowData)}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reset to Row Data</span>
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              💡 How to use Facebook Preview
            </h5>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Select a data source (Template or Mapped data)</li>
              <li>• Use the slider or dropdown to choose a row</li>
              <li>• Edit the post content in the text area</li>
              <li>• <strong>Save Across All Tabs</strong> - Updates data in XLSX, CSV, JSON, SQL tabs</li>
              <li>• <strong>Revert to Previous</strong> - Undo your edits before saving</li>
              <li>• Copy to clipboard and paste into Facebook</li>
              <li>• Character limit: {maxCharacters.toLocaleString()} characters</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

