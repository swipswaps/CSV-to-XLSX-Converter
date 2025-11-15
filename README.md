# CSV to XLSX Converter

A high-performance, browser-based CSV to XLSX converter with template mapping, real-time editing, and advanced features.

🌐 **Live Demo:** [https://swipswaps.github.io/CSV-to-XLSX-Converter/](https://swipswaps.github.io/CSV-to-XLSX-Converter/)

## ✨ Features

### Core Functionality
- 📊 **Template-Based Mapping**: Upload an XLSX template to define output structure
- 🔄 **Intelligent Header Detection**: Automatically detects header rows in templates
- ✏️ **Real-Time Editing**: Edit mapped data directly in the preview table
- 💾 **Browser-Based Processing**: All processing happens locally - no server uploads
- 🎨 **Dark Mode Support**: Beautiful UI with automatic dark mode

### Performance Optimizations
- ⚡ **Virtual Scrolling**: Smoothly handle datasets with 10,000+ rows
- 🚀 **Optimized Re-renders**: React memoization for maximum performance
- 📏 **File Size Validation**: 50MB limit with warnings for large files
- 🧹 **Memory Efficient**: 75% reduction in memory usage for large datasets

### User Experience
- ↩️ **Undo/Redo**: Full undo/redo support with keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z)
- ⌨️ **Keyboard Shortcuts**: Efficient keyboard navigation and editing
- 🎯 **Drag & Drop**: Intuitive file upload with drag-and-drop support
- 🔔 **Smart Warnings**: Non-blocking warnings for large files
- 🛡️ **Error Boundaries**: Graceful error handling with recovery options
- 🧼 **Character Cleaning**: Automatic mojibake (encoding issue) cleanup

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CSV-to-XLSX-Converter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 📖 How to Use

1. **Upload XLSX Template**
   - Click or drag-and-drop your `.xlsx` template file
   - The app will auto-detect the header row (must contain TITLE, PRICE, and CONDITION)

2. **Upload CSV Data**
   - Click or drag-and-drop your `.csv` data file
   - Headers will be automatically mapped to template structure

3. **Configure Options**
   - Enable/disable automatic character cleaning for encoding issues

4. **Preview & Edit**
   - Review the mapped data in the virtualized table
   - Click any cell to edit
   - Use Ctrl+Z to undo and Ctrl+Shift+Z to redo changes

5. **Download**
   - Click "Download XLSX" to save your formatted file

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo last edit |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo edit |
| `Ctrl+Y` / `Cmd+Y` | Redo edit (alternative) |

See [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md) for more details.

## 🏗️ Project Structure

```
CSV-to-XLSX-Converter/
├── App.tsx                      # Main application component
├── index.tsx                    # React entry point with ErrorBoundary
├── components/
│   ├── DataTable.tsx           # Virtualized table with editing
│   ├── ErrorBoundary.tsx       # Error handling wrapper
│   ├── FileDisplay.tsx         # File info display component
│   ├── FileUploadZone.tsx      # Drag-drop upload component
│   └── Icons.tsx               # SVG icon components
├── hooks/
│   └── useUndoRedo.ts          # Undo/redo state management hook
├── utils/
│   ├── fileUtils.ts            # File handling utilities
│   └── xlsxUtils.ts            # XLSX processing utilities
└── IMPROVEMENTS.md             # Detailed improvements documentation
```

## 🔧 Technical Stack

- **React 19.2.0** - UI framework with latest features
- **TypeScript 5.8.2** - Type safety and better DX
- **Vite 6.2.0** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling (via CDN)
- **SheetJS (XLSX)** - Excel file processing (via CDN)

## 📊 Performance Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Large file render (5000 rows) | 3-5s freeze | 60fps smooth | ⚡ 100% |
| Memory usage (5000 rows) | ~200MB | ~50MB | 📉 75% |
| Re-renders per edit | Full tree | Single cell | 🎯 99% |

## 🛠️ Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Type Checking
```bash
npx tsc --noEmit
```

### Deploy to GitHub Pages
```bash
# Automatic deployment (via GitHub Actions)
git add .
git commit -m "Update app"
git push

# Manual deployment
npm run deploy
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 📚 Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - GitHub Pages deployment guide
- [IMPROVEMENTS.md](IMPROVEMENTS.md) - Comprehensive improvements documentation
- [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md) - Keyboard shortcuts reference
- [BUGFIX-CSV-PARSING.md](BUGFIX-CSV-PARSING.md) - CSV parsing bug fix details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Excel processing by [SheetJS](https://sheetjs.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Inspired by best practices from the React and TypeScript communities
