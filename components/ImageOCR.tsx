import React, { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { UploadIcon } from './Icons';

interface ImageOCRProps {
  onDataExtracted: (data: any[][]) => void;
}

export const ImageOCR: React.FC<ImageOCRProps> = ({ onDataExtracted }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [fileStatuses, setFileStatuses] = useState<Record<string, 'pending' | 'processing' | 'success' | 'error'>>({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles(newFiles);
      
      // Generate preview URLs
      const urls: Record<string, string> = {};
      newFiles.forEach(file => {
        urls[file.name] = URL.createObjectURL(file);
      });
      setPreviewUrls(urls);
      
      // Initialize statuses
      const statuses: Record<string, 'pending'> = {};
      newFiles.forEach(file => {
        statuses[file.name] = 'pending';
      });
      setFileStatuses(statuses);
    }
  };

  const handleDragEvent = useCallback((event: React.DragEvent<HTMLElement>, dragging: boolean) => {
    if (processing) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(dragging);
  }, [processing]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (processing) return;
    handleDragEvent(event, false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const newFiles = Array.from(event.dataTransfer.files);
      setFiles(newFiles);
      
      // Generate preview URLs
      const urls: Record<string, string> = {};
      newFiles.forEach(file => {
        urls[file.name] = URL.createObjectURL(file);
      });
      setPreviewUrls(urls);
      
      // Initialize statuses
      const statuses: Record<string, 'pending'> = {};
      newFiles.forEach(file => {
        statuses[file.name] = 'pending';
      });
      setFileStatuses(statuses);
      
      event.dataTransfer.clearData();
    }
  }, [handleDragEvent, processing]);

  const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve({ mimeType: file.type, data: base64Data });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractDataFromImage = async (image: { mimeType: string; data: string }): Promise<any[]> => {
    // This is a placeholder - in production, you would call the Gemini API
    // For now, we'll simulate OCR extraction
    toast.error('OCR extraction requires Gemini API key. Please configure GEMINI_API_KEY in environment variables.');
    throw new Error('Gemini API not configured');
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one image file');
      return;
    }

    setProcessing(true);
    const allData: any[][] = [];

    for (const file of files) {
      try {
        setFileStatuses(prev => ({ ...prev, [file.name]: 'processing' }));
        toast.loading(`Processing ${file.name}...`, { id: file.name });

        const base64Image = await fileToBase64(file);
        const data = await extractDataFromImage(base64Image);

        if (data && data.length > 0) {
          // Convert JSON objects to array format
          const headers = Object.keys(data[0]);
          const rows = data.map(obj => headers.map(h => obj[h]));
          allData.push([headers, ...rows]);
          
          setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
          toast.success(`Extracted ${data.length} rows from ${file.name}`, { id: file.name });
        } else {
          setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
          toast('No data found in ' + file.name, { id: file.name, icon: '⚠️' });
        }
      } catch (err) {
        setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
        toast.error(`Failed to process ${file.name}`, { id: file.name });
      }
    }

    setProcessing(false);

    if (allData.length > 0) {
      // Merge all data
      const mergedData = allData.flat();
      onDataExtracted(mergedData);
      toast.success('OCR extraction complete!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
          Upload Images for OCR Extraction
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Upload images of receipts, tables, or printed documents. The AI will extract structured data automatically.
        </p>

        <label
          htmlFor="ocr-file-upload"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-colors
            ${processing ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800/50' : 'cursor-pointer'}
            ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
          onDragEnter={(e) => handleDragEvent(e, true)}
          onDragLeave={(e) => handleDragEvent(e, false)}
          onDragOver={(e) => handleDragEvent(e, true)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon className="w-12 h-12 mb-4 text-slate-500 dark:text-slate-400" />
            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, HEIC, PDF (images only)</p>
          </div>
          <input
            id="ocr-file-upload"
            type="file"
            className="hidden"
            multiple
            accept="image/*,.heic,.heif"
            onChange={handleFileChange}
            disabled={processing}
          />
        </label>

        {files.length > 0 && (
          <div className="mt-8">
            <h4 className="font-semibold text-lg mb-4 text-slate-800 dark:text-slate-200">
              Selected Files ({files.length}):
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {files.map((file) => (
                <div key={file.name} className="relative aspect-square border rounded-lg overflow-hidden shadow-sm bg-slate-100 dark:bg-slate-700">
                  {previewUrls[file.name] ? (
                    <img src={previewUrls[file.name]} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-xs text-slate-500">Loading...</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 truncate backdrop-blur-sm flex justify-between items-center">
                    <span className="truncate">{file.name}</span>
                    {fileStatuses[file.name] === 'processing' && (
                      <div className="w-4 h-4 rounded-full animate-spin border-2 border-dashed border-white border-t-transparent"></div>
                    )}
                    {fileStatuses[file.name] === 'success' && (
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                      </svg>
                    )}
                    {fileStatuses[file.name] === 'error' && (
                      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleProcess}
              disabled={processing}
              className="mt-8 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {processing ? 'Processing...' : `Extract Data from ${files.length} File(s)`}
            </button>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Note:</strong> OCR extraction requires a Gemini API key. This feature is currently a placeholder.
            To enable it, you would need to:
          </p>
          <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
            <li>Get a Gemini API key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
            <li>Add it to your environment variables as <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">GEMINI_API_KEY</code></li>
            <li>Implement the Gemini API call in the <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">extractDataFromImage</code> function</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

