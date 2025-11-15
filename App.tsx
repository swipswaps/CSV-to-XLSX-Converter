
import React, { useState, useCallback, useRef } from 'react';
import { FileCsvIcon, UploadCloudIcon, XCircleIcon, DownloadIcon, LoaderIcon, FileXlsxIcon, RefreshCwIcon } from './components/Icons';

// Declare global variables from CDN scripts
declare const XLSX: any;

type AppState = 'upload' | 'preview';
type MappedDataRow = Record<string, any>;

const App: React.FC = () => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [templateHeaders, setTemplateHeaders] = useState<string[]>([]);
  const [mappedData, setMappedData] = useState<MappedDataRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('upload');
  const [cleanCharacters, setCleanCharacters] = useState<boolean>(true);

  const [isDraggingTemplate, setIsDraggingTemplate] = useState<boolean>(false);
  const [isDraggingData, setIsDraggingData] = useState<boolean>(false);

  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const dataFileInputRef = useRef<HTMLInputElement>(null);

  const startOver = () => {
    setTemplateFile(null);
    setDataFile(null);
    setTemplateHeaders([]);
    setMappedData([]);
    setError(null);
    setAppState('upload');
    if(templateFileInputRef.current) templateFileInputRef.current.value = "";
    if(dataFileInputRef.current) dataFileInputRef.current.value = "";
  };
  
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          resolve(event.target.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer.'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading file.'));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          resolve(event.target.result);
        } else {
          reject(new Error('Failed to read file as text.'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading file.'));
      };
      // Explicitly read as UTF-8 to handle special characters and emojis correctly.
      reader.readAsText(file, 'UTF-8');
    });
  };

  const processTemplate = async (file: File) => {
    try {
      const bufferArray = await readFileAsArrayBuffer(file);
      const wb = XLSX.read(bufferArray, { type: 'buffer' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 'A1:Z10' }); // Scan first 10 rows
      
      let headerRowIndex = -1;
      let headers: string[] = [];

      // Intelligent header detection
      for (let i = 0; i < data.length; i++) {
          const row = data[i] as any[];
          const normalizedRow = row.map(h => String(h || '').trim().toUpperCase());
          // Look for a row with common required headers
          if (normalizedRow.includes('TITLE') && normalizedRow.includes('PRICE') && normalizedRow.includes('CONDITION')) {
              headerRowIndex = i;
              headers = row.map(h => String(h || '').trim()).filter(h => h);
              break;
          }
      }

      if (headerRowIndex !== -1 && headers.length > 0) {
          setTemplateHeaders(headers);
          setTemplateFile(file);
          setError(null);
      } else {
          throw new Error("Could not automatically detect a valid header row. Ensure your template contains 'TITLE', 'PRICE', and 'CONDITION' columns.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to process template: ${errorMessage}`);
      removeTemplateFile();
    }
  };

  const handleTemplateFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      if (selectedFile.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && !selectedFile.name.endsWith('.xlsx')) {
        setError('Invalid template file type. Please upload a .xlsx file.');
        setTemplateFile(null);
        setTemplateHeaders([]);
      } else {
        processTemplate(selectedFile);
      }
    }
  };
  
  const handleDataFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
        if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
            setError('Invalid data file type. Please upload a .csv file.');
            setDataFile(null);
        } else {
            setDataFile(selectedFile);
            setError(null);
        }
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, over: boolean, type: 'template' | 'data') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'template') setIsDraggingTemplate(over);
    if (type === 'data') setIsDraggingData(over);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'template' | 'data') => {
    handleDragEvents(e, false, type);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
       if (type === 'template') handleTemplateFileChange(files[0]);
       if (type === 'data') handleDataFileChange(files[0]);
    }
  };

  const removeTemplateFile = () => {
    setTemplateFile(null);
    setTemplateHeaders([]);
    setDataFile(null); 
    setError(null);
    if(templateFileInputRef.current) templateFileInputRef.current.value = "";
  };
  
  const removeDataFile = () => {
    setDataFile(null);
    setError(null);
    if(dataFileInputRef.current) dataFileInputRef.current.value = "";
  };

  const cleanMojibake = (str: string): string => {
    if (typeof str !== 'string') return str;
    // Enhanced cleanup for common UTF-8 -> Windows-1252/Latin-1 issues
    return str
      .replace(/â€”/g, '—') // em dash
      .replace(/â€“/g, '–') // en dash
      .replace(/â€™/g, '’') // right single quote
      .replace(/â€˜/g, '‘') // left single quote
      .replace(/â€œ/g, '“') // left double quote
      .replace(/â€/g, '”') // right double quote
      .replace(/â€¦/g, '…') // ellipsis
      .replace(/Â¢/g, '¢')   // cent sign
      .replace(/ðŸ”¥/g, '🔥'); // fire emoji
  };

  const processAndPreview = useCallback(async () => {
    if (!dataFile || !templateFile || templateHeaders.length === 0) {
      setError('Both a template and a data file are required.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // THE FIX: Read the CSV as text with UTF-8 encoding
      const text = await readFileAsText(dataFile);
      const workbook = XLSX.read(text, { type: 'string' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const csvData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });

      if (csvData.length === 0) {
        throw new Error('CSV data file is empty or could not be parsed.');
      }

      const csvHeaders = Object.keys(csvData[0] as object);
      const csvHeaderMap = csvHeaders.reduce((acc, header) => {
        acc[header.toLowerCase().trim()] = header;
        return acc;
      }, {} as Record<string, string>);

      let mapped = csvData.map(csvRow => {
        const newRow: MappedDataRow = {};
        templateHeaders.forEach(templateHeader => {
          const csvHeaderKey = templateHeader.toLowerCase().trim();
          const originalCsvHeader = csvHeaderMap[csvHeaderKey];
          if (originalCsvHeader && (csvRow as MappedDataRow)[originalCsvHeader] !== undefined) {
            newRow[templateHeader] = (csvRow as MappedDataRow)[originalCsvHeader];
          } else {
            newRow[templateHeader] = '';
          }
        });
        return newRow;
      });
      
      // The cleanup function now acts as a secondary fallback.
      if (cleanCharacters) {
        mapped.forEach(row => {
          for (const key in row) {
            if (typeof row[key] === 'string') {
              row[key] = cleanMojibake(row[key]);
            }
          }
        });
      }

      setMappedData(mapped);
      setAppState('preview');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during conversion.';
      setError(`Conversion failed: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [dataFile, templateFile, templateHeaders, cleanCharacters]);
  
  const handleCellChange = (rowIndex: number, header: string, value: string) => {
      const updatedData = [...mappedData];
      updatedData[rowIndex][header] = value;
      setMappedData(updatedData);
  };
  
  const downloadXLSX = () => {
      if (!dataFile) return;
      const worksheet = XLSX.utils.json_to_sheet(mappedData, { header: templateHeaders });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mapped Data');
      
      const outputFilename = dataFile.name.replace(/\.csv$/i, '_mapped.xlsx');
      XLSX.writeFile(workbook, outputFilename);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const FileDisplay = ({ file, onRemove, icon }: { file: File, onRemove: () => void, icon: React.ReactNode }) => (
    <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          {icon}
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</p>
          </div>
        </div>
        <button onClick={onRemove} className="text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0 ml-2" aria-label="Remove file">
          <XCircleIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">CSV to XLSX Converter</h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Map, preview, and edit your data before exporting.</p>
        </header>

        <main className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 md:p-8">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-center" role="alert">
              <XCircleIcon className="h-6 w-6 mr-3"/>
              <div>
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {appState === 'upload' && (
            <div>
              {/* Step 1: Upload Template */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                    <span className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold mr-3 ${templateFile ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'}`}>1</span>
                    Upload XLSX Template
                </h2>
                 {!templateFile ? (
                     <div
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-300 ${isDraggingTemplate ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                        onDragOver={(e) => handleDragEvents(e, true, 'template')} onDragLeave={(e) => handleDragEvents(e, false, 'template')} onDragEnter={(e) => handleDragEvents(e, true, 'template')} onDrop={(e) => handleDrop(e, 'template')}>
                        <UploadCloudIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-4 text-slate-600 dark:text-slate-400"><span className="font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer" onClick={() => templateFileInputRef.current?.click()}>Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">.xlsx files only</p>
                        <input type="file" ref={templateFileInputRef} onChange={(e) => handleTemplateFileChange(e.target.files?.[0] || null)} accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" />
                     </div>
                ) : (
                    <FileDisplay file={templateFile} onRemove={removeTemplateFile} icon={<FileXlsxIcon className="h-10 w-10 text-green-600 flex-shrink-0" />} />
                )}
              </div>

              {/* Step 2: Upload Data */}
              <div className={`transition-opacity duration-500 ${templateFile ? 'opacity-100' : 'opacity-50'}`}>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                    <span className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold mr-3 transition-colors ${!templateFile ? 'bg-slate-400 dark:bg-slate-600 text-white' : dataFile ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'}`}>2</span>
                    Upload CSV Data File
                </h2>
                {!dataFile ? (
                    <div
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-300 ${!templateFile ? 'cursor-not-allowed bg-slate-50 dark:bg-slate-700/50' : isDraggingData ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                        onDragOver={(e) => templateFile && handleDragEvents(e, true, 'data')} onDragLeave={(e) => templateFile && handleDragEvents(e, false, 'data')} onDragEnter={(e) => templateFile && handleDragEvents(e, true, 'data')} onDrop={(e) => templateFile && handleDrop(e, 'data')}>
                        <UploadCloudIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-4 text-slate-600 dark:text-slate-400"><span className={`font-semibold ${templateFile ? 'text-indigo-600 dark:text-indigo-400 cursor-pointer' : 'text-slate-500'}`} onClick={() => templateFile && dataFileInputRef.current?.click()}>Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{templateFile ? '.csv files only' : 'Please upload a template first'}</p>
                        <input type="file" ref={dataFileInputRef} onChange={(e) => handleDataFileChange(e.target.files?.[0] || null)} accept=".csv, text/csv" className="hidden" disabled={!templateFile}/>
                     </div>
                ) : (
                    <FileDisplay file={dataFile} onRemove={removeDataFile} icon={<FileCsvIcon className="h-10 w-10 text-indigo-500 flex-shrink-0" />} />
                )}
              </div>
              
              {/* Step 3: Options */}
              {templateFile && dataFile && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                        <span className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold mr-3 bg-indigo-600 text-white`}>3</span>
                        Options
                    </h2>
                    <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4">
                        <input type="checkbox" id="cleanChars" checked={cleanCharacters} onChange={(e) => setCleanCharacters(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        <label htmlFor="cleanChars" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Automatically clean special characters
                            <p className="text-xs text-slate-500 dark:text-slate-400">Fixes issues like 'â€”' appearing instead of '—'.</p>
                        </label>
                    </div>
                </div>
              )}


              {templateFile && dataFile && (
                <div className="mt-8">
                  <button onClick={processAndPreview} disabled={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed transform hover:scale-105">
                    {isProcessing ? (
                      <><LoaderIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />Processing...</>
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
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Preview & Edit Data</h2>
              <div className="overflow-x-auto max-h-[50vh] bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 z-10">
                    <tr>
                      {templateHeaders.map(header => (
                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {mappedData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        {templateHeaders.map(header => (
                          <td key={header} className="px-1 py-0.5 whitespace-nowrap">
                            <input
                              type="text"
                              value={row[header]}
                              onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                              className="w-full text-sm px-2 py-1.5 bg-transparent border border-transparent rounded-md transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-slate-50 dark:focus:bg-slate-700 dark:text-slate-200"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                  <button onClick={startOver} className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all duration-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200">
                      <RefreshCwIcon className="mr-2 h-5 w-5" /> Start Over
                  </button>
                  <button onClick={downloadXLSX} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105">
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
