# Latka Data Scraper Chrome Extension

A powerful Chrome extension for scraping company data from GetLatka's SaaS companies page and exporting it directly to Google Sheets using Google Apps Script.

## Prerequisites

- **Latka Account**: You must have an active account at [GetLatka](https://getlatka.com) to access the SaaS companies data
- **Google Account**: Required for setting up Google Apps Script and Google Sheets integration
- **Chrome Browser**: Extension is built for Chromium-based browsers

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd latka-scraper-extension
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Extension
```bash
npm run build
```
This will generate a `dist` folder containing the compiled extension files.

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Turn on **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the generated `dist` folder
5. Voila! The extension is now installed

## 🚀 Features

- **Automatic Data Extraction**: Scrapes company data from Latka's SaaS companies page
- **Google Sheets Integration**: Direct export to Google Sheets via Apps Script
- **Data Deduplication**: Prevents duplicate entries in your spreadsheet
- **Smart Filtering**: Automatically excludes Interview columns
- **CORS-Free Export**: Background script handles all external requests
- **Modern UI**: Clean, premium sidebar interface with smooth animations
- **Real-time Progress**: Visual feedback during scraping process
- **Hot Reload**: Development server with automatic reloading

## 📁 Project Structure

```
latka-scraper-extension/
├── src/                          # Source code
│   ├── content/                  # Content scripts
│   │   └── content.js           # Main content script
│   ├── background/              # Background scripts
│   │   └── background.js        # Service worker
│   ├── popup/                   # Extension popup
│   │   ├── popup.html          # Popup HTML
│   │   └── popup.js            # Popup script
│   └── assets/                  # Static assets
│       ├── sidebar.css         # Sidebar styles
│       └── *.png              # Extension icons
├── dist/                        # Built extension (generated)
├── webpack.config.js           # Webpack configuration
├── dev-server.js              # Development server
├── hot-reload.js              # Hot reload functionality
├── manifest.json              # Extension manifest
└── package.json               # Dependencies and scripts
```

## 🛠️ Development

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Development mode (with hot reload):**
   ```bash
   npm start
   ```
   This starts both the webpack dev server and hot-reload server.

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Load extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Available Scripts

- `npm run dev` - Development build with watch mode
- `npm run build` - Production build (optimized, minified)
- `npm run build:dev` - Development build without watch
- `npm run clean` - Clean dist folder
- `npm run serve` - Start hot-reload server only
- `npm start` - Start both dev server and hot-reload

## 🎯 Usage

### 1. Access GetLatka
- Click on the extension icon in your Chrome toolbar
- Click **Open Latka** - this will navigate you to the GetLatka SaaS companies dashboard
- Make sure you're logged into your Latka account

### 2. Start Scraping
- On the GetLatka page, the extension will automatically inject a sidebar
- Open the sidebar from the extension interface
- Click **Start Scraping** to begin collecting company data
- The extension will automatically scroll through pages and gather all available data

### 3. Configure Google Sheets Export

Before exporting data, you need to set up Google Apps Script integration:

1. **Set up Google Apps Script** (see [APPSCRIPT.md](./APPSCRIPT.md) for detailed guide)
2. From the sidebar, click **Configure Google Sheets**
3. In the configuration modal, add your Apps Script URL
4. The Apps Script URL format: `https://script.google.com/macros/s/{SCRIPT_ID}/exec`

### 4. Export Data
- Once scraping is complete and Google Apps Script is configured
- Click **Export to Google Sheets**
- Data will be automatically sent to your configured Google Sheet with deduplication

## 🔧 Build Configuration

The project uses Webpack 5 with the following optimizations:

### Production Build Features:
- **Code Minification**: Terser for JavaScript minification
- **CSS Extraction**: Separate CSS files for better caching
- **Asset Optimization**: Optimized images and assets
- **Tree Shaking**: Removes unused code
- **Console Removal**: Strips console.log statements

### Development Features:
- **Hot Reload**: Automatic extension reload on file changes
- **Source Maps**: For easier debugging
- **Fast Rebuilds**: Optimized for development speed

## 📦 Output

The build process generates a `dist` folder containing:

```
dist/
├── manifest.json              # Extension manifest
├── popup.html                 # Extension popup
├── content.js                 # Content script (minified in production)
├── background.js              # Background script (minified in production)
├── popup.js                   # Popup script (minified in production)
├── assets/
│   ├── sidebar.css           # Extracted CSS (production only)
│   └── *.png                 # Extension icons
└── vendors.js                # Vendor libraries (production only)
```

## 🎨 Styling

The extension uses:
- **Inter Font**: Premium typography
- **Dark Theme**: Modern dark UI
- **Responsive Design**: Works on different screen sizes
- **Smooth Animations**: CSS transitions and transforms

## Troubleshooting

### Common Issues

1. **CORS Errors**: The extension uses background scripts to bypass CORS restrictions
2. **Scraping Not Working**: Ensure you're logged into GetLatka and on the correct page
3. **Export Failing**: Verify your Apps Script URL is correct and the script is deployed

### Support

For issues and feature requests, please check the project's issue tracker or documentation.

## 🔒 Permissions

The extension requires minimal permissions:
- `activeTab`: Access current tab for scraping
- `scripting`: Inject content scripts
- `storage`: Store user preferences
- `tabs`: Check tab status for popup

## 📝 License

This project is for educational and personal use. Please respect GetLatka's terms of service when using this extension.