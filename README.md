# Latka Data Scraper Extension

A Chrome extension for automatically scraping SaaS company data from GetLatka.com.

## 🚀 Features

- **Automatic Data Extraction**: Scrapes company data from Latka's SaaS companies page
- **Smart Filtering**: Automatically excludes Interview columns
- **Data Export**: Export scraped data to console or download as JSON
- **Modern UI**: Clean, premium sidebar interface with dark theme
- **Hot Reload**: Development server with automatic reloading
- **Optimized Build**: Production-ready builds with minification

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

1. **Install the extension** in Chrome
2. **Navigate** to [getlatka.com/saas-companies](https://getlatka.com/saas-companies)
3. **Sidebar appears automatically** on the right side
4. **Click "Start Scraping"** to extract data
5. **Export data** when scraping is complete

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

## 🔒 Permissions

The extension requires minimal permissions:
- `activeTab`: Access current tab for scraping
- `scripting`: Inject content scripts
- `storage`: Store user preferences
- `tabs`: Check tab status for popup

## 📝 License

MIT License - see LICENSE file for details.