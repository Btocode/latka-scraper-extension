# Latka Data Scraper Chrome Extension

A Chrome extension that automatically detects the GetLatka SaaS companies page and provides a beautiful sidebar interface for data scraping and export.

## Features

- 🎯 **Auto-detection**: Automatically activates when visiting `getlatka.com/saas-companies`
- 🎨 **Beautiful UI**: Modern gradient sidebar with smooth animations
- 📊 **Data Preview**: Real-time preview of scraped data in a clean table format
- 📤 **Export Function**: One-click export to console (ready for CSV/JSON export)
- 🔄 **Status Indicators**: Real-time status updates with visual feedback
- 📱 **Responsive Design**: Works on different screen sizes

## Installation

### Method 1: Load Unpacked Extension (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" 
4. Select the `latka-scraper-extension` folder
5. The extension should now appear in your extensions list

### Method 2: Using the Extension

1. Navigate to `https://getlatka.com/saas-companies`
2. The extension will automatically activate (look for the badge on the extension icon)
3. Click the extension icon in the toolbar to open the popup
4. Click "Show Sidebar" or the sidebar will auto-appear
5. Use the sidebar to scrape and export data

## How It Works

### Automatic Detection
- The extension monitors page URLs
- When `getlatka.com/saas-companies` is detected, it automatically activates
- A badge appears on the extension icon indicating it's ready

### Sidebar Interface
- **Status Indicator**: Shows current scraping status with animated dots
- **Data Preview**: Displays scraped data in a formatted table
- **Export Button**: Logs data to console (ready for integration with export formats)
- **Company Counter**: Shows total number of companies found

### User Flow
1. Visit the target page
2. Extension auto-activates with sidebar
3. Click "Start Scraping" to begin data collection
4. Preview data in the sidebar table
5. Click "Export Data" to output to console

## File Structure

```
latka-scraper-extension/
├── manifest.json          # Extension configuration
├── content.js            # Main content script with page detection
├── sidebar.css           # Beautiful sidebar styling
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── background.js        # Background service worker
├── icon16.png          # Extension icons (16x16)
├── icon32.png          # Extension icons (32x32)
├── icon48.png          # Extension icons (48x48)
├── icon128.png         # Extension icons (128x128)
└── README.md           # This file
```

## Development

### Current Implementation
- ✅ Automatic page detection
- ✅ Beautiful sidebar UI with animations
- ✅ Status indicators and feedback
- ✅ Mock data preview system
- ✅ Export functionality (console output)
- ✅ Responsive design
- ✅ Extension popup interface

### Ready for Scraper Integration
The extension structure is ready for the actual scraping implementation. The current version includes:
- Mock data for testing UI/UX
- Complete sidebar interface
- Export mechanism ready for real data
- Status management system

## Next Steps

1. **Scraper Implementation**: Add actual DOM scraping logic based on the page structure
2. **Data Processing**: Implement data cleaning and formatting
3. **Export Formats**: Add CSV, JSON, and other export options
4. **Error Handling**: Add robust error handling for edge cases
5. **Configuration**: Add user settings for scraping preferences

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension format)
- **Permissions**: `activeTab`, `scripting`, `storage`
- **Host Permissions**: `https://getlatka.com/*`
- **Content Script**: Runs on `getlatka.com/saas-companies*`
- **Modern CSS**: Uses backdrop-filter, gradients, and smooth animations
- **Responsive**: Adapts to different screen sizes

## Support

For issues or feature requests, please refer to the extension development documentation or contact the developer.