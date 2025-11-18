# Marketplace Data Editor

Transform your marketplace data with ease! Extract text from images using AI-powered OCR, edit in multiple formats, preview as Facebook posts, and export to XLSX, CSV, JSON, or SQL - all in your browser with complete privacy.

🌐 **Live Demo:** [https://swipswaps.github.io/CSV-to-XLSX-Converter/](https://swipswaps.github.io/CSV-to-XLSX-Converter/)

## ✨ What Can This App Do?

### 📸 Extract Data from Images (OCR)
Upload photos of receipts, tables, or documents and automatically extract the text. The app uses advanced image preprocessing to improve accuracy by 50-90%:
- **Automatic Enhancement**: Converts images to high-contrast black & white for better recognition
- **HEIC Support**: Works with Apple iPhone photos (automatically converts HEIC to JPG)
- **Batch Processing**: Upload multiple images at once
- **Real-Time Progress**: Watch each processing step with color-coded logs
- **See What OCR Sees**: View the preprocessed images to understand results
- **100% Private**: All processing happens in your browser - no uploads to servers

### 📊 Edit Data in Multiple Formats
View and edit your data in 6 different formats:
- **XLSX (Spreadsheet)**: Click cells to edit, duplicate/delete rows, copy selections
- **CSV (Text)**: Edit raw CSV with automatic comma/quote handling
- **JSON (API-Ready)**: Perfect for web applications and APIs
- **SQL (Database)**: Ready-to-run CREATE TABLE and INSERT statements
- **Facebook Preview**: See how your data looks as Facebook posts
- **OCR Import**: Extract data from images

### 🚀 Export & Download
Download your edited data in any format:
- **XLSX**: Excel-compatible spreadsheet files
- **CSV**: Universal text format (works everywhere)
- **JSON**: For developers and APIs
- **SQL**: Import directly into databases

### 🎯 Key Benefits
- ✅ **No Installation**: Works in your browser
- ✅ **100% Free**: No API keys, no costs, no limits
- ✅ **Complete Privacy**: Your data never leaves your computer
- ✅ **Works Offline**: No internet needed after initial load
- ✅ **Fast**: Handles 10,000+ rows smoothly

## 🚀 How to Use

### Option 1: Use Online (Easiest!)
Just visit the live demo - no installation needed:
👉 [https://swipswaps.github.io/CSV-to-XLSX-Converter/](https://swipswaps.github.io/CSV-to-XLSX-Converter/)

### Option 2: Run Locally
If you want to run it on your own computer:

1. Make sure you have Node.js installed (version 16 or higher)
2. Download or clone this repository
3. Open terminal in the project folder
4. Run: `npm install`
5. Run: `npm run dev`
6. Open your browser to `http://localhost:3000`

## 📖 Step-by-Step Guides

### 📸 Extract Data from Images (OCR)

**When to use:** You have photos of receipts, tables, forms, or documents

**Steps:**

1. **Open the OCR Tab**
   - Click "📸 OCR Import" at the top
   - Wait a few seconds for the OCR engine to load (first time only)

2. **Upload Your Images**
   - Drag and drop images into the upload area
   - Or click to browse and select files
   - You can upload multiple images at once
   - Supported formats: JPG, PNG, HEIC (iPhone photos), and more

3. **Watch the Magic Happen**
   - Click "🚀 Extract Data from X File(s)"
   - The app automatically enhances each image for better accuracy:
     - Converts to grayscale
     - Increases contrast
     - Sharpens text
     - Converts to black & white
   - Watch the progress log to see what's happening
   - View the preprocessed images to see what the OCR engine sees

4. **Review the Results**
   - Extracted text appears in the "Extracted Text Results" section
   - If the app detects structured data (tables, lists), it appears in the XLSX editor
   - Switch between tabs to see your data in different formats

5. **Edit and Export**
   - Make any needed corrections in the XLSX editor
   - Download as XLSX, CSV, JSON, or SQL

**Tips for Best OCR Results:**
- ✅ Use clear, well-lit photos
- ✅ Make sure text is readable (not blurry)
- ✅ Straight-on photos work better than angled shots
- ✅ High contrast between text and background helps
- ✅ For tables, clear column separators (lines, spaces) improve accuracy

### 📊 Edit Data in Different Formats

**When to use:** You want to view or edit your data in a specific format

The app opens with a sample marketplace template already loaded. You can:

**XLSX Editor (Spreadsheet)**
- Click any cell to edit
- Press Tab to move between cells
- Manage rows:
  - Hover over row number → Click ⋮ menu → Duplicate or Delete
  - Or select cells → Use "Duplicate Row" or "Delete Row" buttons
  - Shift+Click to select multiple cells
  - Ctrl+C to copy
- Click "Save As XLSX" to download

**CSV Editor (Text Format)**
- Edit the raw CSV text directly
- The app automatically handles commas and quotes correctly
- Click "Download CSV" to save

**JSON Editor (For Developers)**
- See your data as a JSON array
- Each row becomes an object: `{"TITLE": "...", "PRICE": "..."}`
- Perfect for APIs and web apps
- Click "Download JSON" to save

**SQL Editor (For Databases)**
- Get ready-to-run SQL statements
- Includes CREATE TABLE and INSERT commands
- Column names are automatically formatted for SQL
- Click "Download SQL" to save

**Facebook Preview**
- See how any row looks as a Facebook post
- Edit the post content
- Save changes back to all other tabs
- Character counter shows remaining space (63,206 limit)

### 🔄 Convert CSV to XLSX

**When to use:** You have a CSV file and want to convert it to Excel format

**Steps:**

1. **Start from Template Screen**
   - The app opens with a template already loaded
   - Click "Continue to Upload CSV Data"

2. **Upload Your CSV File**
   - Drag and drop your CSV file
   - Or click to browse and select it
   - The app automatically maps your CSV columns to the template

3. **Fix Encoding Issues (Optional)**
   - If you see weird characters (é instead of é), enable "Clean Mojibake"
   - This fixes common encoding problems

4. **Preview and Edit**
   - Review the mapped data in the table
   - Click any cell to make changes
   - Use Ctrl+Z to undo, Ctrl+Shift+Z to redo
   - The app can handle huge files (10,000+ rows) smoothly

5. **Download**
   - Click "Download XLSX"
   - Your file is ready to use in Excel!

### 📝 Create a CSV Template

**When to use:** You want a blank CSV template to fill in with your data

**Steps:**

1. **Choose Your Template**
   - Use the default template that loads automatically
   - Or click "Upload Different Template" to use your own

2. **Download the Template**
   - Scroll to "Download Options"
   - Choose one:
     - **"Download with Sample Data"** - See examples of how to fill it in
     - **"Download Headers Only"** - Get a blank template

3. **Fill It In**
   - Open the CSV in Excel, Google Sheets, or any text editor
   - Add your data following the format
   - Save the file

4. **Convert to XLSX**
   - Click "Continue to Upload CSV Data"
   - Upload your filled CSV
   - Download as XLSX

## 💡 Common Questions

### What happens when my data contains commas?
Don't worry! The app automatically handles commas, quotes, and special characters correctly. Your data will work perfectly in Excel, Google Sheets, and other tools.

### Which format should I use?
- **XLSX** - For Excel users, final deliverables, marketplace uploads
- **CSV** - For importing to other tools, email attachments, simple data
- **JSON** - For developers, APIs, web applications
- **SQL** - For databases (MySQL, PostgreSQL, etc.)

### Can I edit the data after extracting it with OCR?
Yes! After OCR extraction, you can edit the data in any of the editors (XLSX, CSV, JSON, SQL) before downloading.

### Is my data safe?
Absolutely! Everything happens in your browser. Your data never leaves your computer - no uploads to servers.

### Does it work offline?
Yes! After the initial page load, you can use the app without an internet connection.

### What's the file size limit?
The app can handle files up to 50MB and datasets with 10,000+ rows smoothly.

## ⌨️ Keyboard Shortcuts

- **Ctrl+Z** (Cmd+Z on Mac) - Undo
- **Ctrl+Shift+Z** (Cmd+Shift+Z on Mac) - Redo
- **Tab** - Move to next cell in spreadsheet
- **Ctrl+C** - Copy selected cells

## 🔧 For Developers

### Technology Stack
- React 19.2.0 + TypeScript 5.8.2
- Vite 6.4.1 (build tool)
- Tesseract.js 5.1.1 (OCR engine)
- heic2any 0.0.4 (HEIC conversion)
- react-spreadsheet (spreadsheet component)
- SheetJS/XLSX (Excel processing)
- Tailwind CSS (styling)

### Build Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- **Tesseract.js** - Amazing OCR engine that works in the browser
- **SheetJS** - Excel file processing library
- **React Spreadsheet** - Interactive spreadsheet component
- **heic2any** - HEIC to JPEG conversion

## 📞 Support

Found a bug or have a feature request? Please open an issue on GitHub.

---

**Made with ❤️ for marketplace sellers and data enthusiasts**
