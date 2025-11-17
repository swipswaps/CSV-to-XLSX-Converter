import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import toast from 'react-hot-toast';

interface OCRSettingsProps {
  onApiKeyChange?: (configured: boolean) => void;
}

export const OCRSettings: React.FC<OCRSettingsProps> = ({ onApiKeyChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const configured = geminiService.isConfigured();
    setIsConfigured(configured);
    if (configured) {
      setApiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    }
  }, []);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }

    // Save to localStorage
    localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    
    // Update service
    geminiService.setApiKey(apiKey.trim());
    
    setIsConfigured(true);
    setIsExpanded(false);
    toast.success('✅ Gemini API key saved successfully!');
    
    if (onApiKeyChange) {
      onApiKeyChange(true);
    }
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setApiKey('');
    setIsConfigured(false);
    geminiService.setApiKey(undefined);
    toast.success('API key removed');
    
    if (onApiKeyChange) {
      onApiKeyChange(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            🔑 OCR Configuration
          </h3>
          {isConfigured && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
              ✓ Configured
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isExpanded ? 'Hide' : isConfigured ? 'Manage' : 'Setup'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Google Gemini API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Save
              </button>
              {isConfigured && (
                <button
                  onClick={handleRemoveApiKey}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              📖 How to get your API key:
            </h4>
            <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside">
              <li>
                Visit{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Google AI Studio
                </a>
              </li>
              <li>Sign in with your Google account</li>
              <li>Click "Create API Key" or "Get API Key"</li>
              <li>Copy the key and paste it above</li>
              <li>Click "Save" to start using OCR</li>
            </ol>
            <p className="mt-3 text-xs text-blue-700 dark:text-blue-400">
              💡 <strong>Free tier:</strong> Gemini API offers generous free usage limits. Your API key is stored locally in your browser.
            </p>
          </div>

          {isConfigured && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-300">
                ✅ <strong>Ready to use!</strong> You can now upload images and extract data automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {!isExpanded && !isConfigured && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Click "Setup" to configure your Gemini API key and enable OCR extraction.
        </p>
      )}
    </div>
  );
};

