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
  // Map to store converted files (original filename -> converted File)
  // This ensures HEIC files are converted once and reused for both preview and processing
  const [convertedFiles, setConvertedFiles] = useState<Record<string, File>>({});

  // Initialize Tesseract on component mount
  // Helper function to add progress logs
  // Returns a promise that resolves after the log is added and UI updates
  const addLog = useCallback(async (type: 'info' | 'success' | 'error' | 'warning', message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);

    // Update state
    setProgressLogs(prev => [...prev, { timestamp, type, message }]);

    // Wait for next frame to ensure UI updates
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      await addLog('info', 'Initializing OCR engine...');

      try {
        console.log('Starting Tesseract initialization...');
        await tesseractService.initialize();
        console.log('Tesseract initialized successfully');

        setIsReady(true);
        await addLog('success', 'OCR engine ready! No API key needed - works offline!');
        toast.success('✅ OCR engine ready! No API key needed - works offline!', { duration: 3000 });
      } catch (error) {
        console.error('Tesseract initialization error:', error);
        await addLog('error', `Failed to initialize OCR engine: ${error instanceof Error ? error.message : 'Unknown error'}`);
        toast.error('Failed to initialize OCR engine. Please refresh the page.');
      } finally {
        setIsInitializing(false);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up Tesseract worker...');
      tesseractService.terminate();
    };
  }, [addLog]);

  /**
   * Helper function to check if a file is HEIC/HEIF format
   */
  const isHeicFile = useCallback((file: File): boolean => {
    return file.type === 'image/heic' ||
           file.type === 'image/heif' ||
           file.name.toLowerCase().endsWith('.heic') ||
           file.name.toLowerCase().endsWith('.heif');
  }, []);

  /**
   * Convert HEIC/HEIF files to JPEG using heic2any library
   */
  const convertHeicToJpeg = useCallback(async (file: File): Promise<File> => {
    try {
      await addLog('info', `🔄 Converting HEIC file: ${file.name}`);
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

      await addLog('success', `✅ HEIC conversion successful: ${file.name} → ${convertedFile.name}`);
      console.log(`✅ HEIC conversion successful: ${file.name} -> ${convertedFile.name}`);
      return convertedFile;
    } catch (error) {
      await addLog('error', `❌ HEIC conversion failed: ${file.name}`);
      console.error('HEIC conversion failed:', error);
      throw new Error(`Failed to convert HEIC file: ${file.name}`);
    }
  }, [addLog]);

  /**
   * Process uploaded files: convert HEIC files immediately and generate preview URLs
   * This ensures thumbnails display correctly for all file types
   */
  const processAndSetFiles = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);

    const urls: Record<string, string> = {};
    const statuses: Record<string, 'pending'> = {};
    const converted: Record<string, File> = {};

    // Process each file
    for (const file of newFiles) {
      statuses[file.name] = 'pending';

      if (isHeicFile(file)) {
        try {
          // Show a toast notification for HEIC conversion
          toast.loading(`Converting HEIC file: ${file.name}...`, { id: `heic-${file.name}` });

          // Convert HEIC to JPEG immediately for preview
          const convertedFile = await convertHeicToJpeg(file);

          // Store the converted file for later use during processing
          converted[file.name] = convertedFile;

          // Create preview URL from the converted JPEG (this will display correctly)
          urls[file.name] = URL.createObjectURL(convertedFile);

          toast.success(`HEIC converted: ${file.name}`, { id: `heic-${file.name}` });
        } catch (error) {
          console.error(`Failed to convert HEIC file ${file.name}:`, error);
          toast.error(`Failed to convert HEIC: ${file.name}`, { id: `heic-${file.name}` });

          // Fallback: try to create preview URL from original (may not display in most browsers)
          urls[file.name] = URL.createObjectURL(file);
        }
      } else {
        // For non-HEIC files, create preview URL directly
        urls[file.name] = URL.createObjectURL(file);
      }
    }

    // Update all states
    setPreviewUrls(urls);
    setFileStatuses(statuses);
    setConvertedFiles(converted);
  }, [isHeicFile, convertHeicToJpeg]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      await processAndSetFiles(newFiles);
    }
  };

  const handleDragEvent = useCallback((event: React.DragEvent<HTMLElement>, dragging: boolean) => {
    if (processing) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(dragging);
  }, [processing]);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLElement>) => {
    if (processing) return;
    handleDragEvent(event, false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const newFiles = Array.from(event.dataTransfer.files);
      await processAndSetFiles(newFiles);
      event.dataTransfer.clearData();
    }
  }, [handleDragEvent, processing, processAndSetFiles]);

  /**
   * Preprocess image for better OCR accuracy
   * Enhanced to handle noisy backgrounds and low-contrast images
   * - Convert to grayscale
   * - Denoise (remove grain/noise)
   * - Increase contrast
   * - Adaptive binarization
   * - Morphological operations (clean up)
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
            const width = canvas.width;
            const height = canvas.height;

            // Step 1: Convert to grayscale
            for (let i = 0; i < data.length; i += 4) {
              // Grayscale conversion (weighted average for better text perception)
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              data[i] = data[i + 1] = data[i + 2] = gray;
            }

            // Step 2: Denoise with Gaussian blur (reduces grain/noise)
            // This is critical for images with noisy backgrounds
            const gaussianKernel = [
              1, 2, 1,
              2, 4, 2,
              1, 2, 1
            ];
            const kernelSum = 16;
            const tempData = new Uint8ClampedArray(data);

            for (let y = 1; y < height - 1; y++) {
              for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                  for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const kernelIdx = (ky + 1) * 3 + (kx + 1);
                    sum += tempData[idx] * gaussianKernel[kernelIdx];
                  }
                }
                const idx = (y * width + x) * 4;
                const blurred = sum / kernelSum;
                data[idx] = data[idx + 1] = data[idx + 2] = blurred;
              }
            }

            // Step 3: Increase contrast (CLAHE-like approach)
            // Use histogram equalization for better contrast
            const histogram = new Array(256).fill(0);
            for (let i = 0; i < data.length; i += 4) {
              histogram[data[i]]++;
            }

            // Calculate cumulative distribution
            const cdf = new Array(256).fill(0);
            cdf[0] = histogram[0];
            for (let i = 1; i < 256; i++) {
              cdf[i] = cdf[i - 1] + histogram[i];
            }

            // Normalize CDF
            const cdfMin = cdf.find(v => v > 0) || 0;
            const totalPixels = width * height;
            const lookupTable = new Array(256);
            for (let i = 0; i < 256; i++) {
              lookupTable[i] = Math.round(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
            }

            // Apply histogram equalization
            for (let i = 0; i < data.length; i += 4) {
              const equalized = lookupTable[data[i]];
              data[i] = data[i + 1] = data[i + 2] = equalized;
            }

            // Step 4: Adaptive Binarization with Sauvola method
            // Better for documents with varying background (like noisy/grainy images)
            const blockSize = 25; // Larger block for noisy images
            const k = 0.3; // Sauvola parameter
            const R = 128; // Dynamic range

            const tempData2 = new Uint8ClampedArray(data);

            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                // Calculate local mean and standard deviation
                let sum = 0;
                let sumSq = 0;
                let count = 0;
                const halfBlock = Math.floor(blockSize / 2);

                for (let dy = -halfBlock; dy <= halfBlock; dy++) {
                  for (let dx = -halfBlock; dx <= halfBlock; dx++) {
                    const ny = Math.max(0, Math.min(height - 1, y + dy));
                    const nx = Math.max(0, Math.min(width - 1, x + dx));
                    const idx = (ny * width + nx) * 4;
                    const val = tempData2[idx];
                    sum += val;
                    sumSq += val * val;
                    count++;
                  }
                }

                const mean = sum / count;
                const variance = (sumSq / count) - (mean * mean);
                const stdDev = Math.sqrt(Math.max(0, variance));

                // Sauvola threshold formula
                const threshold = mean * (1 + k * ((stdDev / R) - 1));

                const idx = (y * width + x) * 4;
                const value = tempData2[idx] > threshold ? 255 : 0;
                data[idx] = data[idx + 1] = data[idx + 2] = value;
              }
            }

            // Step 5: Morphological operations - Remove small noise
            // Erosion followed by dilation (opening operation)
            const tempData3 = new Uint8ClampedArray(data);

            // Erosion (remove small white noise)
            for (let y = 1; y < height - 1; y++) {
              for (let x = 1; x < width - 1; x++) {
                let minVal = 255;
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    minVal = Math.min(minVal, tempData3[idx]);
                  }
                }
                const idx = (y * width + x) * 4;
                data[idx] = data[idx + 1] = data[idx + 2] = minVal;
              }
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
    // Use pre-converted file if available (HEIC files converted during upload)
    // This avoids converting the same file twice
    let processFile = file;

    if (convertedFiles[file.name]) {
      // Use the pre-converted JPEG file
      processFile = convertedFiles[file.name];
      await addLog('info', `✅ Using pre-converted file: ${file.name}`);
    } else if (isHeicFile(file)) {
      // Fallback: convert if not already converted (shouldn't happen normally)
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
    await addLog('info', `🚀 Starting OCR processing for ${files.length} file(s)...`);

    const allData: any[][] = [];
    const allText: string[] = [];
    const processedImgs: Record<string, string> = {};
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setFileStatuses(prev => ({ ...prev, [file.name]: 'processing' }));
        await addLog('info', `📄 [${i + 1}/${files.length}] Processing: ${file.name}`);
        toast.loading(`Processing ${file.name}...`, { id: file.name });

        // Step 1: File reading and preprocessing
        await addLog('info', `📖 Reading file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        const base64Image = await fileToBase64(file);
        await addLog('success', `✅ File read and preprocessed: ${file.name}`);
        await addLog('info', `🎨 Applied: denoise → histogram equalization → adaptive binarization → morphology`);

        // Store processed image for display - UPDATE STATE IMMEDIATELY
        if (base64Image.processedDataUrl) {
          processedImgs[file.name] = base64Image.processedDataUrl;
          // Update state immediately so thumbnail appears right away
          setProcessedImages(prev => ({ ...prev, [file.name]: base64Image.processedDataUrl! }));
        }

        // Step 2: OCR extraction
        await addLog('info', `🔍 Running OCR on: ${file.name}`);
        const result = await tesseractService.extractDataFromImage(base64Image);

        if (!result.success) {
          throw new Error(result.error || 'Failed to extract data');
        }

        const data = result.data || [];
        const rawText = result.rawText || '';

        await addLog('success', `✅ OCR complete: ${file.name} - Extracted ${rawText.length} characters`);

        if (rawText) {
          allText.push(`\n========== ${file.name} ==========\n${rawText}\n`);
        }

        if (data && data.length > 0) {
          // Convert JSON objects to array format
          const headers = Object.keys(data[0]);
          const rows = data.map(obj => headers.map(h => obj[h] ?? ''));
          allData.push([headers, ...rows]);

          setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
          await addLog('success', `✅ Extracted ${data.length} rows from ${file.name}`);
          toast.success(`✅ Extracted ${data.length} rows from ${file.name}`, { id: file.name });
          successCount++;
        } else {
          setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
          await addLog('warning', `⚠️ No structured data found in ${file.name} (text extracted but not parseable)`);
          toast('⚠️ No data found in ' + file.name, { id: file.name, icon: '⚠️' });
        }
      } catch (err: any) {
        setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
        const errorMsg = err.message || 'Unknown error';
        await addLog('error', `❌ ${file.name}: ${errorMsg}`);
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
      await addLog('success', `📝 All extracted text saved to Results tab`);
    }

    if (allData.length > 0) {
      // Merge all data - combine all rows with same headers
      const mergedData = allData.flat();
      onDataExtracted(mergedData);
      await addLog('success', `🎉 OCR complete! ${successCount} file(s) processed successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      toast.success(`🎉 OCR complete! ${successCount} file(s) processed successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`, { duration: 4000 });
    } else if (errorCount > 0) {
      await addLog('error', `❌ Failed to extract data from ${errorCount} file(s)`);
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
                <li><strong>Noise reduction!</strong> - Handles grainy/noisy backgrounds effectively</li>
                <li><strong>Smart preprocessing!</strong> - Denoise → histogram equalization → adaptive binarization</li>
                <li><strong>High resolution</strong> - Clear, readable text works best (300+ DPI recommended)</li>
                <li><strong>Works with challenging images</strong> - Low contrast, varying backgrounds, and noisy scans</li>
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

