# Bug Fix: CSV Parsing Issue

## Issue
When uploading CSV and XLSX template files, the app displayed "0 rows loaded" or incorrectly parsed data with fields split at wrong positions.

## Root Cause
The XLSX library's built-in CSV parser (`XLSX.read()` with `type: 'string'`) does not properly handle **quoted fields containing commas**. 

For example, a CSV row like:
```csv
1,"545W Bifacial Solar Panels - BRAND NEW - 14¢/W","Hi — John Kimball here, owner of Sun Electronics",$77.00,New
```

Was being incorrectly parsed, breaking on commas inside the quoted description field instead of respecting the CSV quoting rules.

## Solution
Implemented a **custom CSV parser** (`parseCSV()`) that correctly handles:
- ✅ Quoted fields with commas inside
- ✅ Escaped quotes (`""` inside quoted fields)
- ✅ Different line endings (`\n`, `\r`, `\r\n`)
- ✅ Empty fields
- ✅ Proper field trimming

## Changes Made

### 1. `utils/xlsxUtils.ts`
- **Added** `parseCSV()` function (lines 62-110) - Custom CSV parser with proper quote handling
- **Modified** `processCSVData()` function - Now uses custom parser instead of XLSX.read()
- **Removed** dependency on XLSX library for CSV parsing (still used for XLSX template reading)

### 2. Process Management
- **Added** `dev.sh` - Helper script to start/stop/restart/check dev server
- **Updated** `package.json` - Added `stop` and `restart` npm scripts

### 3. Code Cleanup
- Removed debug console.log statements from production code
- Kept error logging for actual errors

## How to Use New Scripts

### Stop the dev server
```bash
npm run stop
# or
./dev.sh stop
```

### Restart the dev server
```bash
npm run restart
# or
./dev.sh restart
```

### Check server status
```bash
./dev.sh status
```

## Why the App Persists After Terminal Kill

When you run `npm run dev`, it starts a Vite dev server process that continues running even if you close the terminal window. This is normal Unix/Linux behavior for background processes.

**To properly stop the server:**
1. Use `Ctrl+C` in the terminal running the dev server, OR
2. Use `npm run stop` to kill the process on port 3000, OR
3. Use `./dev.sh stop` for more comprehensive cleanup

## Testing
The fix has been tested with:
- ✅ CSV files with quoted fields containing commas
- ✅ CSV files with special characters (¢, —, etc.)
- ✅ Multiple rows of data
- ✅ Case-insensitive header matching
- ✅ Template files with various header positions

## Result
The app now correctly parses CSV files and displays all data rows with proper field mapping to the template structure.

