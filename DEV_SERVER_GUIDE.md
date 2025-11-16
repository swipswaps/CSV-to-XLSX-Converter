# Development Server Management Guide

## 🚀 Quick Start

### Start Dev Server
```bash
npm run dev
```

Expected output:
```
VITE v6.4.1  ready in 282 ms
➜  Local:   http://localhost:3000/
```

### Stop Dev Server
```bash
# Press Ctrl+C in the terminal running the dev server
```

---

## 🔧 Common Issues & Solutions

### Issue 1: Port Already in Use

**Symptom:**
```
Port 3000 is in use, trying another one...
➜  Local:   http://localhost:3001/
```

**Solution:**
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000,3001 | xargs -r kill -9 2>/dev/null

# Restart dev server
npm run dev
```

### Issue 2: Changes Not Showing in Browser

**Possible causes:**
1. Compilation error (check terminal for errors)
2. Browser cache (hard refresh with Ctrl+Shift+R)
3. Wrong port (check if server is on 3000 or 3001)

**Solution:**
```bash
# 1. Check terminal for errors
# 2. If errors, fix them and save the file
# 3. If no errors, clean restart:

# Stop server (Ctrl+C)
lsof -ti:3000,3001 | xargs -r kill -9 2>/dev/null
npm run dev

# 4. Hard refresh browser (Ctrl+Shift+R)
```

### Issue 3: Multiple Dev Servers Running

**Symptom:**
- Multiple terminal windows with `npm run dev`
- Confusion about which port is active

**Solution:**
```bash
# Kill all Vite processes
pkill -f "vite"

# Start fresh
npm run dev
```

### Issue 4: HMR (Hot Module Reload) Not Working

**Symptom:**
- File changes don't trigger browser updates
- Terminal shows no HMR messages

**Solution:**
```bash
# 1. Check for compilation errors in terminal
# 2. If errors exist, fix them
# 3. If no errors, restart dev server:

# Stop server (Ctrl+C)
npm run dev
```

---

## 📋 Useful Commands

### Check What's Running on Ports
```bash
# Check port 3000
lsof -i:3000

# Check port 3001
lsof -i:3001

# Check both ports
lsof -i:3000,3001
```

### Kill Specific Port
```bash
# Kill port 3000
lsof -ti:3000 | xargs kill -9

# Kill port 3001
lsof -ti:3001 | xargs kill -9
```

### Kill All Vite Processes
```bash
pkill -f "vite"
```

### Check Vite Processes
```bash
ps aux | grep vite | grep -v grep
```

---

## 🎯 Best Practices

### 1. **Always Use One Terminal for Dev Server**
- Don't start multiple dev servers
- Keep the terminal visible to see HMR updates and errors

### 2. **Watch for Compilation Errors**
- HMR will show errors in the terminal
- Fix errors immediately - they prevent updates

### 3. **Clean Restart When in Doubt**
```bash
# Stop everything
pkill -f "vite"

# Clean ports
lsof -ti:3000,3001 | xargs -r kill -9 2>/dev/null

# Start fresh
npm run dev
```

### 4. **Hard Refresh Browser After Major Changes**
- Press `Ctrl+Shift+R` (Linux/Windows)
- Press `Cmd+Shift+R` (Mac)
- Or open DevTools and right-click refresh button → "Empty Cache and Hard Reload"

### 5. **Check the Correct Port**
- Default: http://localhost:3000/
- If 3000 is busy: http://localhost:3001/
- Always check terminal output for actual port

---

## 🔍 Debugging Checklist

When changes aren't showing:

- [ ] Check terminal for compilation errors
- [ ] Verify dev server is running (check terminal)
- [ ] Confirm correct port (3000 or 3001?)
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check if file was saved
- [ ] Look for HMR update messages in terminal
- [ ] Try clean restart (kill processes + restart)

---

## 📊 Understanding HMR Messages

### Normal HMR Update
```
10:59:25 AM [vite] (client) hmr update /App.tsx
```
✅ This is good - changes detected and applied

### HMR Error
```
10:28:39 AM [vite] Internal server error: Expected corresponding JSX closing tag
```
❌ This is bad - fix the error, save file, HMR will retry

### Multiple Updates
```
10:59:25 AM [vite] (client) hmr update /App.tsx (x5)
```
⚠️ This means file was saved 5 times quickly - normal if you're making rapid changes

---

## 🛠️ Advanced: Custom npm Scripts

Add these to `package.json` for easier management:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:clean": "pkill -f vite || true && npm run dev",
    "stop": "pkill -f vite || true",
    "clean-ports": "lsof -ti:3000,3001 | xargs -r kill -9 2>/dev/null || true",
    "restart": "npm run stop && npm run clean-ports && npm run dev"
  }
}
```

Then use:
```bash
npm run dev:clean  # Clean start
npm run stop       # Stop server
npm run restart    # Full restart with port cleanup
```

---

## 📝 Summary

**Start:** `npm run dev`  
**Stop:** `Ctrl+C`  
**Clean Restart:** `pkill -f vite && npm run dev`  
**Port Cleanup:** `lsof -ti:3000,3001 | xargs -r kill -9 2>/dev/null`  

**Remember:**
- Watch terminal for errors
- HMR is your friend - it shows what's happening
- When in doubt, clean restart
- Hard refresh browser if needed

