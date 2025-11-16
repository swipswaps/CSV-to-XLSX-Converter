import React, { useState, useCallback, useEffect } from 'react';
import { FileCsvIcon, XCircleIcon, DownloadIcon, LoaderIcon, FileXlsxIcon, RefreshCwIcon, UndoIcon, RedoIcon, FileTextIcon, FileIcon, PlusIcon, TrashIcon } from './components/Icons';
import { FileUploadZone } from './components/FileUploadZone';
import { FileDisplay } from './components/FileDisplay';
import { DataTable } from './components/DataTable';
import { XLSXEditor } from './components/XLSXEditor';
import { JSONEditor } from './components/JSONEditor';
import { SQLEditor } from './components/SQLEditor';
import { FacebookPreview } from './components/FacebookPreview';
import { validateTemplateFile, validateDataFile } from './utils/fileUtils';
import { processTemplate, processCSVData, exportToXLSX, downloadCSVTemplate, generateCSVTemplate, convertXLSXDataToCSV, MappedDataRow } from './utils/xlsxUtils';
import { downloadCSV } from './utils/downloadUtils';
import { getButtonClasses } from './utils/buttonStyles';
import { useUndoRedo } from './hooks/useUndoRedo';
import toast, { Toaster } from 'react-hot-toast';

type AppState = 'upload' | 'template-preview' | 'preview';
type EditorTab = 'xlsx' | 'csv' | 'json' | 'sql' | 'export' | 'facebook';

const App: React.FC = () => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [templateHeaders, setTemplateHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('upload');
  const [cleanCharacters, setCleanCharacters] = useState<boolean>(true);

  const [isDraggingTemplate, setIsDraggingTemplate] = useState<boolean>(false);
  const [isDraggingData, setIsDraggingData] = useState<boolean>(false);

  // State for editable CSV content
  const [editableCSV, setEditableCSV] = useState<string>('');

  // State for template data (for XLSX editor)
  const [templateData, setTemplateData] = useState<any[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);

  // State for active editor tab
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>('export');

  // Use undo/redo hook for mapped data
  const {
    state: mappedData,
    setState: setMappedData,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory
  } = useUndoRedo<MappedDataRow[]>([]);

  // Load default template on mount
  useEffect(() => {
    const loadDefaultTemplate = async () => {
      setIsLoadingTemplate(true);
      try {
        // Get the base path from the current location
        // In production (GitHub Pages): /CSV-to-XLSX-Converter/
        // In development: /
        const basePath = import.meta.env.BASE_URL || '/';
        const templateUrl = `${basePath}Marketplace_Bulk_Upload_Template.xlsx`;

        // Fetch the default template from public directory
        const response = await fetch(templateUrl);
        if (!response.ok) {
          console.warn('Default template not found at:', templateUrl);
          setIsLoadingTemplate(false);
          return;
        }

        const blob = await response.blob();
        const file = new File([blob], 'Marketplace_Bulk_Upload_Template.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Process the template automatically
        await handleTemplateFileSelect(file);
      } catch (err) {
        console.error('Failed to load default template:', err);
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadDefaultTemplate();
  }, []); // Empty dependency array - only run on mount

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && appState === 'preview') {
        e.preventDefault();
        undo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        if (appState === 'preview') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, appState]);

  const startOver = useCallback(() => {
    setTemplateFile(null);
    setDataFile(null);
    setTemplateHeaders([]);
    resetHistory([]);
    setError(null);
    setFileWarning(null);
    setAppState('upload');
  }, [resetHistory]);

  const handleTemplateFileSelect = useCallback(async (file: File) => {
    setError(null);
    setFileWarning(null);

    const validation = validateTemplateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    if (validation.warning) {
      setFileWarning(validation.warning);
    }

    try {
      const { headers, data, headerRowIndex: templateHeaderRowIndex } = await processTemplate(file);
      setTemplateHeaders(headers);
      setTemplateFile(file);
      setHeaderRowIndex(templateHeaderRowIndex);

      // Set template data for XLSX editor (all rows from the template)
      if (data && data.length > 0) {
        setTemplateData(data);

        // Convert the actual XLSX template data to CSV (starting from header row)
        const csvContent = convertXLSXDataToCSV(data, templateHeaderRowIndex);
        setEditableCSV(csvContent);
      }

      // Automatically show template preview after successful upload
      setAppState('template-preview');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to process template: ${errorMessage}`);
    }
  }, []);

  const handleDataFileSelect = useCallback((file: File) => {
    setError(null);
    setFileWarning(null);
    
    const validation = validateDataFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }
    
    if (validation.warning) {
      setFileWarning(validation.warning);
    }
    
    setDataFile(file);
  }, []);

  const removeTemplateFile = useCallback(() => {
    setTemplateFile(null);
    setTemplateHeaders([]);
    setDataFile(null);
    setError(null);
    setFileWarning(null);
  }, []);

  const removeDataFile = useCallback(() => {
    setDataFile(null);
    setError(null);
    setFileWarning(null);
  }, []);

  const processAndPreview = useCallback(async () => {
    if (!dataFile || !templateFile || templateHeaders.length === 0) {
      setError('Both a template and a data file are required.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const mapped = await processCSVData(dataFile, templateHeaders, cleanCharacters);

      // Reset history with the new data (this also sets the current state)
      resetHistory(mapped);
      setAppState('preview');
      // Switch to XLSX tab when entering preview mode
      setActiveEditorTab('xlsx');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during conversion.';
      setError(`Conversion failed: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [dataFile, templateFile, templateHeaders, cleanCharacters, setMappedData, resetHistory]);

  const handleCellChange = useCallback((rowIndex: number, header: string, value: string) => {
    if (!mappedData) return;
    const updatedData = [...mappedData];
    updatedData[rowIndex][header] = value;
    setMappedData(updatedData);
  }, [mappedData, setMappedData]);

  // Add new empty row
  const handleAddRow = useCallback(() => {
    if (!mappedData || templateHeaders.length === 0) return;

    // Create empty row with all headers
    const newRow: MappedDataRow = {};
    templateHeaders.forEach(header => {
      newRow[header] = '';
    });

    const updatedData = [...mappedData, newRow];
    setMappedData(updatedData);

    toast.success('New row added!', {
      icon: '➕',
      duration: 2000,
    });
  }, [mappedData, templateHeaders, setMappedData]);

  // Delete last row
  const handleDeleteLastRow = useCallback(() => {
    if (!mappedData || mappedData.length === 0) return;

    const updatedData = mappedData.slice(0, -1);
    setMappedData(updatedData);

    toast.success('Last row deleted!', {
      icon: '🗑️',
      duration: 2000,
    });
  }, [mappedData, setMappedData]);

  // Handle Facebook post edits - update template data
  const handleFacebookSaveToTemplateData = useCallback((rowIndex: number, updatedRow: any[]) => {
    const newTemplateData = [...templateData];
    newTemplateData[rowIndex] = updatedRow;
    setTemplateData(newTemplateData);

    // Also update CSV content
    const csvContent = convertXLSXDataToCSV(newTemplateData, headerRowIndex);
    setEditableCSV(csvContent);

    toast.success('Template data updated across all tabs!', {
      icon: '✅',
      duration: 3000,
    });
  }, [templateData, headerRowIndex]);

  // Handle Facebook post edits - update mapped data
  const handleFacebookSaveToMappedData = useCallback((rowIndex: number, updatedRow: any[]) => {
    if (!mappedData) return;

    const newMappedData = [...mappedData];
    newMappedData[rowIndex] = updatedRow;
    setMappedData(newMappedData);

    toast.success('Mapped data updated across all tabs!', {
      icon: '✅',
      duration: 3000,
    });
  }, [mappedData, setMappedData]);

  const downloadXLSX = useCallback(() => {
    if (!dataFile || !mappedData) return;
    exportToXLSX(mappedData, templateHeaders, dataFile.name);
    toast.success(`XLSX file exported successfully!`, {
      icon: '📊',
      duration: 3000,
    });
  }, [dataFile, mappedData, templateHeaders]);

  const handleDownloadCSVTemplate = useCallback((includeExamples: boolean) => {
    if (templateHeaders.length === 0) return;
    const filename = templateFile ? templateFile.name.replace(/\.xlsx$/i, '_template.csv') : 'csv_template.csv';
    downloadCSVTemplate(templateHeaders, filename, includeExamples);
    toast.success(`CSV template downloaded successfully!`, {
      icon: '📥',
      duration: 3000,
    });
  }, [templateHeaders, templateFile]);

  const handleDownloadEditedCSV = useCallback(() => {
    if (!editableCSV) return;
    const filename = templateFile ? templateFile.name.replace(/\.xlsx$/i, '_edited') : 'edited_template';
    downloadCSV(editableCSV, filename);
    toast.success(`CSV file downloaded successfully!`, {
      icon: '📥',
      duration: 3000,
    });
  }, [editableCSV, templateFile]);

  const handleBackToUpload = useCallback(() => {
    setAppState('upload');
  }, []);

  const handleContinueToDataUpload = useCallback(() => {
    setAppState('upload');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center p-4 font-sans">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-slate-200',
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
          },
        }}
      />
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
            Marketplace Data Editor
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Map, preview, edit, and export your data in multiple formats (XLSX, CSV, JSON, SQL, Facebook).
          </p>
        </header>

        <main className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 md:p-8">
          {/* Loading State */}
          {isLoadingTemplate && (
            <div className="flex flex-col items-center justify-center py-12">
              <LoaderIcon className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">Loading template...</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Please wait while we process your template</p>
            </div>
          )}

          {!isLoadingTemplate && (
            <>
              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-center" role="alert">
                  <XCircleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {fileWarning && !error && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md" role="alert">
                  <p className="font-bold">Warning</p>
                  <p>{fileWarning}</p>
                </div>
              )}

              {appState === 'upload' && (
                <div>
              {/* Step 1: Upload Template */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                  <span className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold mr-3 ${
                    templateFile ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'
                  }`}>
                    1
                  </span>
                  Upload XLSX Template
                </h2>
                {!templateFile ? (
                  <FileUploadZone
                    onFileSelect={handleTemplateFileSelect}
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    label="Click to upload"
                    description=".xlsx files only"
                    isDragging={isDraggingTemplate}
                    onDragStateChange={setIsDraggingTemplate}
                  />
                ) : (
                  <div>
                    <FileDisplay
                      file={templateFile}
                      onRemove={removeTemplateFile}
                      icon={<FileXlsxIcon className="h-10 w-10 text-green-600 flex-shrink-0" />}
                    />
                    <div className="mt-3">
                      <button
                        onClick={removeTemplateFile}
                        className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <RefreshCwIcon className="mr-2 h-4 w-4" />
                        Upload Different Template
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Upload Data */}
              <div className={`transition-opacity duration-500 ${templateFile ? 'opacity-100' : 'opacity-50'}`}>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                  <span className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold mr-3 transition-colors ${
                    !templateFile ? 'bg-slate-400 dark:bg-slate-600 text-white' :
                    dataFile ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'
                  }`}>
                    2
                  </span>
                  Upload CSV Data File
                </h2>
                {!dataFile ? (
                  <FileUploadZone
                    onFileSelect={handleDataFileSelect}
                    accept=".csv,text/csv"
                    disabled={!templateFile}
                    label="Click to upload"
                    description={templateFile ? '.csv files only' : 'Please upload a template first'}
                    isDragging={isDraggingData}
                    onDragStateChange={setIsDraggingData}
                  />
                ) : (
                  <FileDisplay
                    file={dataFile}
                    onRemove={removeDataFile}
                    icon={<FileCsvIcon className="h-10 w-10 text-indigo-500 flex-shrink-0" />}
                  />
                )}
              </div>

              {/* Step 3: Options */}
              {templateFile && dataFile && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold mr-3 bg-indigo-600 text-white">
                      3
                    </span>
                    Options
                  </h2>
                  <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4">
                    <input
                      type="checkbox"
                      id="cleanChars"
                      checked={cleanCharacters}
                      onChange={(e) => setCleanCharacters(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="cleanChars" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Automatically clean special characters
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Fixes issues like 'â€"' appearing instead of '—'.
                      </p>
                    </label>
                  </div>
                </div>
              )}

              {templateFile && dataFile && (
                <div className="mt-8">
                  <button
                    onClick={processAndPreview}
                    disabled={isProcessing}
                    className={getButtonClasses({ variant: 'primary', size: 'lg', fullWidth: true, disabled: isProcessing })}
                  >
                    {isProcessing ? (
                      <>
                        <LoaderIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Processing...
                      </>
                    ) : (
                      <>Convert & Preview</>
                    )}
                  </button>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">How it works:</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Upload an <code className="bg-slate-200 dark:bg-slate-700 text-xs px-1 py-0.5 rounded">.xlsx</code> template. The app will auto-detect the header row.</li>
                  <li>Upload your <code className="bg-slate-200 dark:bg-slate-700 text-xs px-1 py-0.5 rounded">.csv</code> data file.</li>
                  <li>Review and edit the mapped data directly in the preview table.</li>
                  <li>Download your perfectly formatted XLSX file. All processing happens in your browser.</li>
                </ol>
              </div>
                </div>
              )}

              {appState === 'template-preview' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                  ✅ Template Loaded Successfully
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Your XLSX template has been processed. Here's the expected CSV format:
                </p>
              </div>

              {/* Template Info */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <FileXlsxIcon className="h-8 w-8 text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      {templateFile?.name}
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong>{templateHeaders.length}</strong> columns detected
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabbed Editor Interface */}
              <div className="mb-6">
                {/* Tab Navigation */}
                <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
                  <nav className="flex flex-wrap space-x-1" aria-label="Editor tabs">
                    <button
                      onClick={() => setActiveEditorTab('export')}
                      className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                        activeEditorTab === 'export'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      📥 Export
                    </button>
                    <button
                      onClick={() => setActiveEditorTab('xlsx')}
                      className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                        activeEditorTab === 'xlsx'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      📊 XLSX Editor
                    </button>
                    <button
                      onClick={() => setActiveEditorTab('csv')}
                      className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                        activeEditorTab === 'csv'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      📄 CSV Editor
                    </button>
                    <button
                      onClick={() => setActiveEditorTab('json')}
                      className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                        activeEditorTab === 'json'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      🔧 JSON Editor
                    </button>
                    <button
                      onClick={() => setActiveEditorTab('sql')}
                      className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                        activeEditorTab === 'sql'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      🗄️ SQL Editor
                    </button>
                    <button
                      onClick={() => setActiveEditorTab('facebook')}
                      className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                        activeEditorTab === 'facebook'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      📘 Facebook Preview
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                  {activeEditorTab === 'export' && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                        📥 Export Template
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Choose how you want to export your template. Download it as CSV to fill in your data, or use the other tabs to export in different formats.
                      </p>

                      {/* CSV Export Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Option 1: With Sample Data */}
                        <div className="bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg p-4 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                          <div className="flex items-start mb-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/50 rounded-lg p-2 mr-3">
                              <FileTextIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                                  CSV with Sample Data
                                </h4>
                                <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
                                  Recommended
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                Includes example rows to show the expected format. Perfect for first-time users.
                              </p>
                              <button
                                onClick={() => handleDownloadCSVTemplate(true)}
                                className={getButtonClasses({ variant: 'primary', size: 'sm', fullWidth: true })}
                              >
                                <DownloadIcon className="mr-2 h-4 w-4" />
                                Download with Examples
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Option 2: Headers Only */}
                        <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                          <div className="flex items-start mb-3">
                            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2 mr-3">
                              <FileIcon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                CSV Headers Only
                              </h4>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                Just the column headers, no sample data. For users who know the format.
                              </p>
                              <button
                                onClick={() => handleDownloadCSVTemplate(false)}
                                className={getButtonClasses({ variant: 'secondary', size: 'sm', fullWidth: true })}
                              >
                                <DownloadIcon className="mr-2 h-4 w-4" />
                                Download Headers Only
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Other Format Options */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          💡 Need a different format?
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          Switch to the other tabs to export as <strong>XLSX</strong>, <strong>JSON</strong>, or <strong>SQL</strong>. Each editor has its own download button.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setActiveEditorTab('xlsx')}
                            className={getButtonClasses({ variant: 'tertiary', size: 'sm' })}
                          >
                            📊 Go to XLSX Editor
                          </button>
                          <button
                            onClick={() => setActiveEditorTab('json')}
                            className={getButtonClasses({ variant: 'tertiary', size: 'sm' })}
                          >
                            🔧 Go to JSON Editor
                          </button>
                          <button
                            onClick={() => setActiveEditorTab('sql')}
                            className={getButtonClasses({ variant: 'tertiary', size: 'sm' })}
                          >
                            🗄️ Go to SQL Editor
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeEditorTab === 'xlsx' && templateData.length > 0 && (
                    <XLSXEditor
                      headers={templateHeaders}
                      initialData={templateData}
                      filename={templateFile?.name.replace(/\.xlsx$/i, '_edited.xlsx') || 'edited_template.xlsx'}
                    />
                  )}

                  {activeEditorTab === 'csv' && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            Edit CSV Template
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            📊 {templateData.length > 0 ? templateData.length - 1 : 0} rows × {templateHeaders.length} columns
                          </p>
                        </div>
                        <button
                          onClick={handleDownloadEditedCSV}
                          className={getButtonClasses({ variant: 'success', size: 'md' })}
                        >
                          <DownloadIcon className="h-4 w-4 mr-2" />
                          Download CSV
                        </button>
                      </div>
                      <textarea
                        value={editableCSV}
                        onChange={(e) => setEditableCSV(e.target.value)}
                        className="w-full h-64 font-mono text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-3 rounded border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Edit your CSV template here..."
                      />
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                        💡 Edit the CSV content directly. Make sure to keep the header row intact.
                      </p>
                    </div>
                  )}

                  {activeEditorTab === 'json' && templateData.length > 0 && (
                    <JSONEditor
                      headers={templateHeaders}
                      data={templateData}
                      filename={templateFile?.name || 'template.json'}
                      headerRowIndex={headerRowIndex}
                    />
                  )}

                  {activeEditorTab === 'sql' && templateData.length > 0 && (
                    <SQLEditor
                      headers={templateHeaders}
                      data={templateData}
                      filename={templateFile?.name || 'template.sql'}
                      tableName="products"
                      headerRowIndex={headerRowIndex}
                    />
                  )}

                  {activeEditorTab === 'facebook' && templateData.length > 0 && (
                    <FacebookPreview
                      templateData={templateData}
                      headerRowIndex={headerRowIndex}
                      mappedData={mappedData}
                      onSaveToTemplateData={handleFacebookSaveToTemplateData}
                      onSaveToMappedData={handleFacebookSaveToMappedData}
                    />
                  )}
                </div>
              </div>

              {/* Headers Display */}
              <div className="mb-6">
                <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Required Column Headers:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {templateHeaders.map((header, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
                      >
                        {header}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  💡 Next Steps:
                </h3>
                <ol className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 list-decimal list-inside">
                  <li>Download the CSV template above (with or without sample data)</li>
                  <li>Fill in your product data in the CSV file</li>
                  <li>Make sure your CSV has the exact same column headers</li>
                  <li>Upload your completed CSV file below to convert to XLSX</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleBackToUpload}
                  className={`flex-1 ${getButtonClasses({ variant: 'secondary', size: 'lg' })}`}
                >
                  <RefreshCwIcon className="mr-2 h-5 w-5" />
                  Change Template
                </button>
                <button
                  onClick={handleContinueToDataUpload}
                  className={`flex-1 ${getButtonClasses({ variant: 'primary', size: 'lg' })}`}
                >
                  Continue to Upload CSV Data →
                </button>
              </div>
                </div>
              )}

              {appState === 'preview' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                      📊 Preview & Edit Data
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      Your CSV data has been mapped to the template. Edit your data in the tabs below.
                    </p>
                  </div>

                  {/* Tabbed Editor Interface */}
                  <div className="mb-6">
                    {/* Tab Navigation */}
                    <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
                      <nav className="flex flex-wrap space-x-1" aria-label="Editor tabs">
                        <button
                          onClick={() => setActiveEditorTab('xlsx')}
                          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                            activeEditorTab === 'xlsx'
                              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          📊 XLSX Editor
                        </button>
                        <button
                          onClick={() => setActiveEditorTab('csv')}
                          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                            activeEditorTab === 'csv'
                              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          📄 CSV Editor
                        </button>
                        <button
                          onClick={() => setActiveEditorTab('json')}
                          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                            activeEditorTab === 'json'
                              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          🔧 JSON Editor
                        </button>
                        <button
                          onClick={() => setActiveEditorTab('sql')}
                          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                            activeEditorTab === 'sql'
                              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          🗄️ SQL Editor
                        </button>
                        <button
                          onClick={() => setActiveEditorTab('facebook')}
                          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                            activeEditorTab === 'facebook'
                              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          📘 Facebook Preview
                        </button>
                      </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[400px]">
                      {activeEditorTab === 'xlsx' && (
                        <div>
                          {/* Show mapped data table if in preview mode, otherwise show template editor */}
                          {appState === 'preview' && mappedData && mappedData.length > 0 ? (
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                    📊 Edit Mapped Data
                                  </h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    <strong>{mappedData?.length || 0}</strong> rows loaded.
                                    Use <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs">Ctrl+Z</kbd> to undo and
                                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs ml-1">Ctrl+Shift+Z</kbd> to redo changes.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={undo}
                                    disabled={!canUndo}
                                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Undo (Ctrl+Z)"
                                  >
                                    <UndoIcon className="h-4 w-4" />
                                    <span className="text-sm hidden sm:inline">Undo</span>
                                  </button>
                                  <button
                                    onClick={redo}
                                    disabled={!canRedo}
                                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Redo (Ctrl+Shift+Z)"
                                  >
                                    <RedoIcon className="h-4 w-4" />
                                    <span className="text-sm hidden sm:inline">Redo</span>
                                  </button>
                                </div>
                              </div>

                              {/* Row Management Buttons */}
                              <div className="mb-4 flex flex-wrap gap-3">
                                <button
                                  onClick={handleAddRow}
                                  disabled={!mappedData || templateHeaders.length === 0}
                                  className={`${getButtonClasses({ variant: 'success', size: 'md', disabled: !mappedData || templateHeaders.length === 0 })} flex items-center gap-2`}
                                  title="Add a new empty row to the end of the table"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  <span>Add Row</span>
                                </button>
                                <button
                                  onClick={handleDeleteLastRow}
                                  disabled={!mappedData || mappedData.length === 0}
                                  className={`${getButtonClasses({ variant: 'danger', size: 'md', disabled: !mappedData || mappedData.length === 0 })} flex items-center gap-2`}
                                  title="Delete the last row from the table"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                  <span>Delete Last Row</span>
                                </button>
                                <div className="flex-1"></div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                                  <span className="font-medium">{mappedData?.length || 0}</span>
                                  <span className="ml-1">row{(mappedData?.length || 0) !== 1 ? 's' : ''}</span>
                                </div>
                              </div>

                              <DataTable
                                headers={templateHeaders}
                                data={mappedData || []}
                                onCellChange={handleCellChange}
                              />

                              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                                <button
                                  onClick={startOver}
                                  className={`w-full sm:w-auto ${getButtonClasses({ variant: 'secondary', size: 'lg' })}`}
                                >
                                  <RefreshCwIcon className="mr-2 h-5 w-5" /> Start Over
                                </button>
                                <button
                                  onClick={downloadXLSX}
                                  disabled={!mappedData || mappedData.length === 0}
                                  className={`w-full sm:w-auto ${getButtonClasses({ variant: 'primary', size: 'lg', disabled: !mappedData || mappedData.length === 0 })}`}
                                >
                                  <DownloadIcon className="mr-2 h-5 w-5" /> Download XLSX
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                              <p>No data available. Please upload a CSV file.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeEditorTab === 'csv' && mappedData && mappedData.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                Edit CSV Data
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                📊 {mappedData.length} rows × {templateHeaders.length} columns
                              </p>
                            </div>
                            <button
                              onClick={downloadXLSX}
                              className={getButtonClasses({ variant: 'success', size: 'md' })}
                            >
                              <DownloadIcon className="h-4 w-4 mr-2" />
                              Download CSV
                            </button>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            💡 CSV view of your mapped data. Switch to XLSX tab to edit individual cells.
                          </div>
                        </div>
                      )}

                      {activeEditorTab === 'json' && mappedData && mappedData.length > 0 && (
                        <JSONEditor
                          headers={templateHeaders}
                          data={[templateHeaders, ...mappedData.map(row => templateHeaders.map(h => row[h] || ''))]}
                          filename="mapped_data.json"
                          headerRowIndex={0}
                        />
                      )}

                      {activeEditorTab === 'sql' && mappedData && mappedData.length > 0 && (
                        <SQLEditor
                          headers={templateHeaders}
                          data={[templateHeaders, ...mappedData.map(row => templateHeaders.map(h => row[h] || ''))]}
                          filename="mapped_data.sql"
                          tableName="products"
                          headerRowIndex={0}
                        />
                      )}

                      {activeEditorTab === 'facebook' && mappedData && mappedData.length > 0 && (
                        <FacebookPreview
                          templateData={templateData}
                          headerRowIndex={headerRowIndex}
                          mappedData={mappedData}
                          onSaveToTemplateData={handleFacebookSaveToTemplateData}
                          onSaveToMappedData={handleFacebookSaveToMappedData}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </main>

        <footer className="text-center mt-8 text-sm text-slate-500 dark:text-slate-500">
          <p>Powered by React, Tailwind CSS, and in-browser file processing.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;

