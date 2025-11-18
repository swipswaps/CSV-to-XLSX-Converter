import React, { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import heic2any from 'heic2any';
import { UploadIcon } from './Icons';
import { tesseractService } from '../services/tesseractService';

interface ImageOCRProps {
  onDataExtracted: (data: any[][]) => void;
}

export const ImageOCR: React.FC<ImageOCRProps> = ({ onDataExtracted }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [fileStatuses, setFileStatuses] = useState<Record<string, 'pending' | 'processing' | 'success' | 'error'>>({});
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize Tesseract on component mount
  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      try {
        await tesseractService.initialize();
        setIsReady(true);
        toast.success('✅ OCR engine ready! No API key needed - works offline!', { duration: 3000 });
      } catch (error) {
        toast.error('Failed to initialize OCR engine. Please refresh the page.');
      } finally {
        setIsInitializing(false);
      }
    };
    init();

    // Cleanup on unmount
    return () => {
      tesseractService.terminate();
    };
  }, []);

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

  /**
   * Convert HEIC/HEIF files to JPEG using heic2any library
   */
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
      console.log(`Converting HEIC file: ${file.name}`);

      // Convert HEIC to JPEG blob
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      });

      // heic2any can return Blob or Blob[], handle both cases
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

      // Create a new File object from the blob
      const convertedFile = new File(
        [blob],
        file.name.replace(/\.heic$/i, '.jpg'),
        { type: 'image/jpeg' }
      );

      console.log(`✅ HEIC conversion successful: ${file.name} -> ${convertedFile.name}`);
      return convertedFile;
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw new Error(`Failed to convert HEIC file: ${file.name}`);
    }
  };

  const fileToBase64 = async (file: File): Promise<{ mimeType: string; data: string }> => {
    // Check if file is HEIC/HEIF and convert it first
    let processFile = file;

    if (file.type === 'image/heic' || file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      try {
        processFile = await convertHeicToJpeg(file);
      } catch (error) {
        throw new Error(`HEIC conversion failed for ${file.name}. Please convert to JPG manually.`);
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve({ mimeType: processFile.type, data: base64Data });
      };
      reader.onerror = reject;
      reader.readAsDataURL(processFile);
    });
  };

  const extractDataFromImage = async (image: { mimeType: string; data: string }): Promise<any[]> => {
    const result = await tesseractService.extractDataFromImage(image);

    if (!result.success) {
      throw new Error(result.error || 'Failed to extract data');
    }

    return result.data || [];
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one image file');
      return;
    }

    if (!isReady) {
      toast.error('OCR engine is still initializing. Please wait...');
      return;
    }

    setProcessing(true);
    const allData: any[][] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        setFileStatuses(prev => ({ ...prev, [file.name]: 'processing' }));
        toast.loading(`Processing ${file.name}...`, { id: file.name });

        const base64Image = await fileToBase64(file);
        const data = await extractDataFromImage(base64Image);

        if (data && data.length > 0) {
          // Convert JSON objects to array format
          const headers = Object.keys(data[0]);
          const rows = data.map(obj => headers.map(h => obj[h] ?? ''));
          allData.push([headers, ...rows]);

          setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
          toast.success(`✅ Extracted ${data.length} rows from ${file.name}`, { id: file.name });
          successCount++;
        } else {
          setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
          toast('⚠️ No data found in ' + file.name, { id: file.name, icon: '⚠️' });
        }
      } catch (err: any) {
        setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
        const errorMsg = err.message || 'Unknown error';
        toast.error(`❌ ${file.name}: ${errorMsg}`, { id: file.name, duration: 5000 });
        errorCount++;
      }
    }

    setProcessing(false);

    if (allData.length > 0) {
      // Merge all data - combine all rows with same headers
      const mergedData = allData.flat();
      onDataExtracted(mergedData);
      toast.success(`🎉 OCR complete! ${successCount} file(s) processed successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`, { duration: 4000 });
    } else if (errorCount > 0) {
      toast.error(`Failed to extract data from ${errorCount} file(s)`, { duration: 4000 });
    }
  };

  return (
    <div className="space-y-6">
      {isInitializing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ⏳ <strong>Initializing OCR engine...</strong> This may take a few seconds on first load.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
          📸 Upload Images for OCR Extraction
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Upload images of receipts, tables, lists, or printed documents. <strong>Tesseract.js</strong> will extract text automatically - works completely offline, no API key needed!
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
              disabled={processing || !isReady}
              className="mt-8 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {processing ? '⏳ Processing...' : !isReady ? '⏳ Initializing OCR...' : `🚀 Extract Data from ${files.length} File(s)`}
            </button>
          </div>
        )}

        {isReady && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>✅ OCR Ready!</strong> Works completely offline - no API key needed!
              </p>
              <ul className="mt-2 text-sm text-green-700 dark:text-green-300 list-disc list-inside space-y-1">
                <li><strong>Tables:</strong> Automatically detects columns and rows</li>
                <li><strong>Lists:</strong> Extracts numbered or bulleted items</li>
                <li><strong>Forms:</strong> Recognizes key-value pairs (Name: John, Date: 2024)</li>
                <li><strong>Documents:</strong> General text extraction from any image</li>
                <li><strong>100% Free:</strong> No API costs, works offline in your browser</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold mb-2">
                💡 Tips for Best Results:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                <li><strong>HEIC supported!</strong> - Automatically converts Apple HEIC photos to JPEG</li>
                <li><strong>High resolution</strong> - Clear, readable text works best</li>
                <li><strong>Good lighting</strong> - High contrast between text and background</li>
                <li><strong>Straight images</strong> - Avoid blurry or skewed photos</li>
                <li><strong>Clean backgrounds</strong> - Minimal noise or watermarks</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

