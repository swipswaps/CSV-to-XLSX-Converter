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
  const [progressLogs, setProgressLogs] = useState<Array<{ timestamp: string; type: 'info' | 'success' | 'error' | 'warning'; message: string }>>([]);
  const [extractedText, setExtractedText] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [processedImages, setProcessedImages] = useState<Record<string, string>>({});

  // Initialize Tesseract on component mount
  // Helper function to add progress logs
  const addLog = useCallback((type: 'info' | 'success' | 'error' | 'warning', message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProgressLogs(prev => [...prev, { timestamp, type, message }]);
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      addLog('info', 'Initializing OCR engine...');
      try {
        await tesseractService.initialize();
        setIsReady(true);
        addLog('success', 'OCR engine ready! No API key needed - works offline!');
        toast.success('✅ OCR engine ready! No API key needed - works offline!', { duration: 3000 });
      } catch (error) {
        addLog('error', 'Failed to initialize OCR engine. Please refresh the page.');
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
  }, [addLog]);

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
      addLog('info', `🔄 Converting HEIC file: ${file.name}`);
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

      addLog('success', `✅ HEIC conversion successful: ${file.name} → ${convertedFile.name}`);
      console.log(`✅ HEIC conversion successful: ${file.name} -> ${convertedFile.name}`);
      return convertedFile;
    } catch (error) {
      addLog('error', `❌ HEIC conversion failed: ${file.name}`);
      console.error('HEIC conversion failed:', error);
      throw new Error(`Failed to convert HEIC file: ${file.name}`);
    }
  };

  /**
   * Preprocess image for better OCR accuracy
   * - Convert to grayscale
   * - Increase contrast
   * - Sharpen
   * - Binarize (black & white)
   */
  const preprocessImage = async (file: File): Promise<{ processedDataUrl: string; originalDataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        const originalDataUrl = e.target?.result as string;
        img.onload = () => {
          try {
            // Create canvas for processing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');

            // Set canvas size to image size (maintain resolution)
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Step 1: Convert to grayscale and increase contrast
            for (let i = 0; i < data.length; i += 4) {
              // Grayscale conversion (weighted average)
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

              // Increase contrast (simple contrast stretch)
              const contrast = 1.5; // Contrast multiplier
              const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
              const adjusted = factor * (gray - 128) + 128;
              const clamped = Math.max(0, Math.min(255, adjusted));

              data[i] = data[i + 1] = data[i + 2] = clamped;
            }

            // Step 2: Apply sharpening kernel
            const sharpenKernel = [
              0, -1, 0,
              -1, 5, -1,
              0, -1, 0
            ];
            const tempData = new Uint8ClampedArray(data);
            const width = canvas.width;
            const height = canvas.height;

            for (let y = 1; y < height - 1; y++) {
              for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                  for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const kernelIdx = (ky + 1) * 3 + (kx + 1);
                    sum += tempData[idx] * sharpenKernel[kernelIdx];
                  }
                }
                const idx = (y * width + x) * 4;
                data[idx] = data[idx + 1] = data[idx + 2] = Math.max(0, Math.min(255, sum));
              }
            }

            // Step 3: Binarization (Otsu-like threshold)
            // Calculate histogram
            const histogram = new Array(256).fill(0);
            for (let i = 0; i < data.length; i += 4) {
              histogram[data[i]]++;
            }

            // Find threshold using simple method (mean-based)
            let sum = 0;
            let count = 0;
            for (let i = 0; i < 256; i++) {
              sum += i * histogram[i];
              count += histogram[i];
            }
            const threshold = sum / count;

            // Apply threshold
            for (let i = 0; i < data.length; i += 4) {
              const value = data[i] > threshold ? 255 : 0;
              data[i] = data[i + 1] = data[i + 2] = value;
            }

            // Put processed image data back
            ctx.putImageData(imageData, 0, 0);

            // Convert to data URL
            const processedDataUrl = canvas.toDataURL('image/png');
            resolve({ processedDataUrl, originalDataUrl });
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = reject;
        img.src = originalDataUrl;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const fileToBase64 = async (file: File): Promise<{ mimeType: string; data: string; processedDataUrl?: string; originalDataUrl?: string }> => {
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

    // Preprocess image for better OCR
    const { processedDataUrl, originalDataUrl } = await preprocessImage(processFile);
    const base64Data = processedDataUrl.split(',')[1];

    return {
      mimeType: 'image/png',
      data: base64Data,
      processedDataUrl,
      originalDataUrl
    };
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

    // Clear previous logs and results
    setProgressLogs([]);
    setExtractedText('');
    setShowResults(false);
    setProcessedImages({});

    setProcessing(true);
    addLog('info', `🚀 Starting OCR processing for ${files.length} file(s)...`);

    const allData: any[][] = [];
    const allText: string[] = [];
    const processedImgs: Record<string, string> = {};
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setFileStatuses(prev => ({ ...prev, [file.name]: 'processing' }));
        addLog('info', `📄 [${i + 1}/${files.length}] Processing: ${file.name}`);
        toast.loading(`Processing ${file.name}...`, { id: file.name });

        // Step 1: File reading and preprocessing
        addLog('info', `📖 Reading file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        const base64Image = await fileToBase64(file);
        addLog('success', `✅ File read and preprocessed: ${file.name}`);
        addLog('info', `🎨 Applied: grayscale → contrast → sharpen → binarize`);

        // Store processed image for display
        if (base64Image.processedDataUrl) {
          processedImgs[file.name] = base64Image.processedDataUrl;
        }

        // Step 2: OCR extraction
        addLog('info', `🔍 Running OCR on: ${file.name}`);
        const result = await tesseractService.extractDataFromImage(base64Image);

        if (!result.success) {
          throw new Error(result.error || 'Failed to extract data');
        }

        const data = result.data || [];
        const rawText = result.rawText || '';

        addLog('success', `✅ OCR complete: ${file.name} - Extracted ${rawText.length} characters`);

        if (rawText) {
          allText.push(`\n========== ${file.name} ==========\n${rawText}\n`);
        }

        if (data && data.length > 0) {
          // Convert JSON objects to array format
          const headers = Object.keys(data[0]);
          const rows = data.map(obj => headers.map(h => obj[h] ?? ''));
          allData.push([headers, ...rows]);

          setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
          addLog('success', `✅ Extracted ${data.length} rows from ${file.name}`);
          toast.success(`✅ Extracted ${data.length} rows from ${file.name}`, { id: file.name });
          successCount++;
        } else {
          setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
          addLog('warning', `⚠️ No structured data found in ${file.name} (text extracted but not parseable)`);
          toast('⚠️ No data found in ' + file.name, { id: file.name, icon: '⚠️' });
        }
      } catch (err: any) {
        setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
        const errorMsg = err.message || 'Unknown error';
        addLog('error', `❌ ${file.name}: ${errorMsg}`);
        toast.error(`❌ ${file.name}: ${errorMsg}`, { id: file.name, duration: 5000 });
        errorCount++;
      }
    }

    setProcessing(false);

    // Save all extracted text and processed images
    if (allText.length > 0) {
      setExtractedText(allText.join('\n'));
      setShowResults(true);
      setProcessedImages(processedImgs);
      addLog('success', `📝 All extracted text saved to Results tab`);
    }

    if (allData.length > 0) {
      // Merge all data - combine all rows with same headers
      const mergedData = allData.flat();
      onDataExtracted(mergedData);
      addLog('success', `🎉 OCR complete! ${successCount} file(s) processed successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      toast.success(`🎉 OCR complete! ${successCount} file(s) processed successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`, { duration: 4000 });
    } else if (errorCount > 0) {
      addLog('error', `❌ Failed to extract data from ${errorCount} file(s)`);
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
                💡 Advanced OCR Features:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                <li><strong>HEIC supported!</strong> - Automatically converts Apple HEIC photos to JPEG</li>
                <li><strong>Image preprocessing!</strong> - Auto-enhances images (grayscale, contrast, sharpen, binarize)</li>
                <li><strong>High resolution</strong> - Clear, readable text works best (300+ DPI recommended)</li>
                <li><strong>Good lighting</strong> - High contrast between text and background</li>
                <li><strong>Straight images</strong> - Avoid blurry or skewed photos</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Progress Log Display */}
      {progressLogs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <span>📊 Processing Log</span>
            {processing && (
              <div className="w-5 h-5 rounded-full animate-spin border-2 border-dashed border-blue-600 border-t-transparent"></div>
            )}
          </h3>
          <div className="bg-slate-900 dark:bg-black rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
            {progressLogs.map((log, index) => (
              <div
                key={index}
                className={`py-1 ${
                  log.type === 'error' ? 'text-red-300' :
                  log.type === 'success' ? 'text-green-300' :
                  log.type === 'warning' ? 'text-yellow-300' :
                  'text-blue-200'
                }`}
              >
                <span className="text-gray-400">[{log.timestamp}]</span>{' '}
                <span className={`font-bold ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  'text-cyan-400'
                }`}>
                  [{log.type.toUpperCase()}]
                </span>{' '}
                {log.message}
              </div>
            ))}
            {processing && (
              <div className="py-1 text-blue-400 animate-pulse">
                <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>{' '}
                <span className="font-semibold text-blue-500">[INFO]</span>{' '}
                Processing in progress...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processed Images Display */}
      {showResults && Object.keys(processedImages).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            🖼️ Preprocessed Images (Enhanced for OCR)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(processedImages).map(([filename, dataUrl]) => (
              <div key={filename} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{filename}</p>
                <img
                  src={dataUrl}
                  alt={`Processed ${filename}`}
                  className="w-full h-auto rounded border border-slate-300 dark:border-slate-600"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Applied: Grayscale → Contrast → Sharpen → Binarize
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            💡 <strong>Tip:</strong> These preprocessed images show how the OCR engine sees your images.
            Black text on white background provides the best accuracy.
          </p>
        </div>
      )}

      {/* Extracted Text Results */}
      {showResults && extractedText && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              📝 Extracted Text Results
            </h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(extractedText);
                toast.success('Copied to clipboard!');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              📋 Copy All Text
            </button>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200 font-mono">
              {extractedText}
            </pre>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            💡 <strong>Tip:</strong> This is the raw text extracted from your images.
            If structured data was detected, it's also available in the other editor tabs.
          </p>
        </div>
      )}
    </div>
  );
};

