# Deployment Guide - GitHub Pages

This guide explains how to deploy the CSV to XLSX Converter to GitHub Pages with automatic deployment and proper handling of page refreshes.

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Install dependencies (including gh-pages)
npm install

# Build the project
npm run build
```

### 2. Push to GitHub

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - CSV to XLSX Converter"

# Add remote repository (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/CSV-to-XLSX-Converter.git

# Push to GitHub
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. The workflow will automatically deploy on every push to main

## 🔧 Configuration

### Base Path Configuration

The app is configured to work with GitHub Pages using the repository name as the base path:

**In `vite.config.ts`:**
```typescript
const base = mode === 'production' 
  ? '/CSV-to-XLSX-Converter/'  // GitHub Pages
  : '/';                        // Local development
```

**For custom domain:** Change the base to `'/'` in production mode.

### SPA Routing Fix (Handles Refresh Issues)

The app uses a 404.html redirect trick to handle page refreshes on GitHub Pages:

1. **`public/404.html`** - Catches 404 errors and redirects to index.html with path stored in sessionStorage
2. **`index.html`** - Restores the path from sessionStorage on load

This ensures the app works correctly even when users refresh the page or access direct URLs.

## 📦 Deployment Methods

### Method 1: Automatic Deployment (Recommended)

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys on every push to main:

```bash
git add .
git commit -m "Update app"
git push
```

The app will be available at: `https://YOUR_USERNAME.github.io/CSV-to-XLSX-Converter/`

### Method 2: Manual Deployment

```bash
npm run deploy
```

This builds and deploys to the `gh-pages` branch.

## 🌐 Custom Domain (Optional)

To use a custom domain:

1. **Update `vite.config.ts`:**
   ```typescript
   const base = '/';  // Change to root for custom domain
   ```

2. **Add CNAME file:**
   ```bash
   echo "yourdomain.com" > public/CNAME
   ```

3. **Configure DNS:**
   - Add A records pointing to GitHub Pages IPs:
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
   - Or add CNAME record: `YOUR_USERNAME.github.io`

4. **Enable in GitHub Settings:**
   - Go to Settings → Pages
   - Enter your custom domain
   - Enable "Enforce HTTPS"

## 🔍 Troubleshooting

### Issue: 404 on page refresh
**Solution:** The 404.html redirect is already configured. Make sure:
- `public/404.html` exists
- `index.html` has the redirect handler script
- GitHub Pages is enabled

### Issue: Assets not loading
**Solution:** Check the base path in `vite.config.ts` matches your deployment URL.

### Issue: Workflow not running
**Solution:** 
1. Check GitHub Actions is enabled in repository settings
2. Ensure workflow file is in `.github/workflows/deploy.yml`
3. Check workflow permissions in Settings → Actions → General

### Issue: Build fails
**Solution:**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

## 📊 Build Output

After running `npm run build`, the `dist/` folder contains:

```
dist/
├── index.html          # Main HTML file
├── 404.html           # SPA redirect handler
├── assets/            # JS, CSS, and other assets
│   ├── index-[hash].js
│   ├── react-vendor-[hash].js
│   └── ...
└── ...
```

## 🎯 Production Checklist

- [ ] Repository pushed to GitHub
- [ ] GitHub Pages enabled with GitHub Actions source
- [ ] Base path configured correctly in `vite.config.ts`
- [ ] Build completes without errors (`npm run build`)
- [ ] App works locally with production build (`npm run preview`)
- [ ] 404.html and index.html redirect scripts in place
- [ ] All features tested in production environment

## 🔗 Useful Links

- **Live App:** `https://YOUR_USERNAME.github.io/CSV-to-XLSX-Converter/`
- **Repository:** `https://github.com/YOUR_USERNAME/CSV-to-XLSX-Converter`
- **GitHub Pages Docs:** https://docs.github.com/en/pages
- **Vite Deployment Guide:** https://vitejs.dev/guide/static-deploy.html

## 📝 Notes

- The app runs entirely in the browser (no backend required)
- All processing is done client-side
- Files are not uploaded to any server
- Works offline after initial load (PWA-ready)

