import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Use repository name as base for GitHub Pages
    // Set to '/' for local development or custom domain
    const base = mode === 'production'
      ? '/CSV-to-XLSX-Converter/'  // GitHub Pages: https://swipswaps.github.io/CSV-to-XLSX-Converter/
      : '/';

    return {
      base,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        // Generate sourcemaps for debugging
        sourcemap: false,
        // Optimize chunks
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
            },
          },
        },
      },
      plugins: [
        react(),
        {
          name: 'copy-template',
          closeBundle() {
            // Copy the default template to dist after build
            try {
              copyFileSync(
                path.resolve(__dirname, 'public/Marketplace_Bulk_Upload_Template.xlsx'),
                path.resolve(__dirname, 'dist/Marketplace_Bulk_Upload_Template.xlsx')
              );
              console.log('✓ Copied default template to dist/');
            } catch (err) {
              console.warn('Warning: Could not copy default template:', err);
            }
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
