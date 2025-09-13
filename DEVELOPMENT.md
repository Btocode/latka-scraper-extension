# Development Guide

## Hot Reload Setup

The extension now includes hot reload functionality for faster development.

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the hot reload server:
```bash
npm run dev
```

3. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this folder
   - The extension will automatically reload when you make changes

### Features Implemented

✅ **Auto-open sidebar** - No popup needed, opens automatically on target page
✅ **White/Gray/Black/Orange color scheme** - Clean professional design
✅ **Wider sidebar (400px)** - More space for data display
✅ **Compact UI** - Optimized spacing and typography
✅ **Keep Open toggle** - Option to prevent auto-close (off by default)
✅ **Hot reload** - Automatic extension reload during development

### File Structure

```
latka-scraper-extension/
├── manifest.json          # Extension config (no popup)
├── content.js            # Auto-open sidebar logic
├── sidebar.css           # White/gray/black/orange theme
├── background.js         # Badge management + hot reload
├── hot-reload.js         # Hot reload client
├── dev-server.js         # Development server
├── package.json          # Dependencies for hot reload
└── icons/               # Extension icons
```

### Usage

1. Navigate to `https://getlatka.com/saas-companies`
2. Sidebar automatically opens on the right (400px width)
3. Use "Keep Open" button to prevent auto-close
4. Make changes to code and see instant reload

### Color Scheme

- **Background**: White (#ffffff)
- **Text**: Dark Gray/Black (#2c3e50, #495057)
- **Primary**: Orange (#ff6b35)
- **Secondary**: Gray (#6c757d)
- **Borders**: Light Gray (#e5e5e5, #dee2e6)
- **Backgrounds**: Light Gray (#f8f9fa)

### Next Steps

Ready for scraper implementation based on DOM structure analysis.