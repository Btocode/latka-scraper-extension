# Installation Guide

## 🚀 Quick Start

### 1. Build the Extension
```bash
npm run build
```

### 2. Load in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project
5. The extension should now appear in your extensions list

### 3. Test the Extension
1. Navigate to [getlatka.com/saas-companies](https://getlatka.com/saas-companies)
2. The sidebar should automatically appear on the right side
3. Click "Start Scraping" to extract data
4. Export your data when complete

## 🔧 Development Mode

### Start Development Server
```bash
npm run dev
```
This starts both webpack and hot-reload servers for development.

### Development Features
- **Hot Reload**: Extension automatically reloads when files change
- **Source Maps**: Better debugging experience
- **Unminified Code**: Easier to debug

## 📁 File Structure

```
dist/                    # Built extension (load this in Chrome)
├── manifest.json       # Extension configuration
├── content.js         # Main content script
├── background.js      # Background service worker
├── popup.html         # Extension popup
├── popup.js          # Popup script
├── hot-reload.js     # Development hot-reload
└── assets/           # CSS and icons
    ├── content.css   # Extracted styles
    └── *.png        # Extension icons
```

## 🐛 Troubleshooting

### "An unknown error occurred when fetching the script"
- Make sure you're loading the `dist` folder, not the root project folder
- Check that all files are present in the dist folder
- Try rebuilding with `npm run build`

### WebSocket Connection Errors
- These are normal when the development server isn't running
- The extension will work fine in production mode
- To enable hot-reload, run `npm run dev`

### Extension Not Working on Latka
- Make sure you're on the correct URL: `getlatka.com/saas-companies`
- Check the browser console for any errors
- Try refreshing the page

## ✅ Success Indicators

When working correctly, you should see:
- Extension icon in Chrome toolbar
- Sidebar appears automatically on Latka page
- "Start Scraping" button is clickable
- Data extraction works without errors
- Export functionality works

## 🔄 Updates

To update the extension:
1. Make your changes to the source code
2. Run `npm run build`
3. Go to `chrome://extensions/`
4. Click the refresh icon on your extension
5. Test on the Latka page
