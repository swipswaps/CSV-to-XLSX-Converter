import React, { useState, useCallback, useEffect } from 'react';
import { FileCsvIcon, XCircleIcon, DownloadIcon, LoaderIcon, FileXlsxIcon, RefreshCwIcon, UndoIcon, RedoIcon } from './components/Icons';
import { FileUploadZone } from './components/FileUploadZone';
import { FileDisplay } from './components/FileDisplay';
import { DataTable } from './components/DataTable';
import { validateTemplateFile, validateDataFile } from './utils/fileUtils';
import { processTemplate, processCSVData, exportToXLSX, MappedDataRow } from './utils/xlsxUtils';
import { useUndoRedo } from './hooks/useUndoRedo';

type AppState = 'upload' | 'preview';

const App: React.FC = () => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [templateHeaders, setTemplateHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('upload');
  const [cleanCharacters, setCleanCharacters] = useState<boolean>(true);

  const [isDraggingTemplate, setIsDraggingTemplate] = useState<boolean>(false);
  const [isDraggingData, setIsDraggingData] = useState<boolean>(false);

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
      const { headers } = await processTemplate(file);
      setTemplateHeaders(headers);
      setTemplateFile(file);
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

  const downloadXLSX = useCallback(() => {
    if (!dataFile || !mappedData) return;
    exportToXLSX(mappedData, templateHeaders, dataFile.name);
  }, [dataFile, mappedData, templateHeaders]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
            CSV to XLSX Converter
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Map, preview, and edit your data before exporting.
          </p>
        </header>

        <main className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 md:p-8">
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
                  <FileDisplay
                    file={templateFile}
                    onRemove={removeTemplateFile}
                    icon={<FileXlsxIcon className="h-10 w-10 text-green-600 flex-shrink-0" />}
                  />
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
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed transform hover:scale-105"
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

          {appState === 'preview' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  Preview & Edit Data
                </h2>
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

              <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  <strong>{mappedData?.length || 0}</strong> rows loaded.
                  Use <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs">Ctrl+Z</kbd> to undo and
                  <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs ml-1">Ctrl+Shift+Z</kbd> to redo changes.
                </p>
              </div>

              <DataTable
                headers={templateHeaders}
                data={mappedData || []}
                onCellChange={handleCellChange}
              />

              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={startOver}
                  className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all duration-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
                >
                  <RefreshCwIcon className="mr-2 h-5 w-5" /> Start Over
                </button>
                <button
                  onClick={downloadXLSX}
                  disabled={!mappedData || mappedData.length === 0}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <DownloadIcon className="mr-2 h-5 w-5" /> Download XLSX
                </button>
              </div>
            </div>
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

