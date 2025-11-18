
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Wait for Tailwind CDN to be ready before rendering React
const renderApp = () => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Check if Tailwind is loaded, otherwise wait a bit
if (document.readyState === 'complete') {
  // Page already loaded, render immediately
  renderApp();
} else {
  // Wait for page to fully load including Tailwind CDN
  window.addEventListener('load', () => {
    // Small delay to ensure Tailwind's MutationObserver is set up
    setTimeout(renderApp, 50);
  });
}
