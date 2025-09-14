#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');

console.log('🔍 Validating Chrome Extension...\n');

// Check required files
const requiredFiles = [
  'manifest.json',
  'content.js',
  'background.js',
  'popup.html',
  'popup.js',
  'assets/content.css',
  'assets/icon16.png',
  'assets/icon32.png',
  'assets/icon48.png',
  'assets/icon128.png'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(DIST_DIR, file);
  const exists = fs.existsSync(filePath);
  const size = exists ? fs.statSync(filePath).size : 0;
  
  console.log(`  ${exists ? '✅' : '❌'} ${file} ${exists ? `(${size} bytes)` : '(missing)'}`);
  
  if (!exists) {
    allFilesExist = false;
  }
});

// Validate manifest.json
console.log('\n📋 Validating manifest.json:');
try {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  console.log(`  ✅ Valid JSON`);
  console.log(`  ✅ Manifest version: ${manifest.manifest_version}`);
  console.log(`  ✅ Name: ${manifest.name}`);
  console.log(`  ✅ Version: ${manifest.version}`);
  
  // Check content scripts
  if (manifest.content_scripts && manifest.content_scripts.length > 0) {
    console.log(`  ✅ Content scripts configured`);
    const cs = manifest.content_scripts[0];
    console.log(`    - Matches: ${cs.matches.join(', ')}`);
    console.log(`    - JS: ${cs.js.join(', ')}`);
    console.log(`    - CSS: ${cs.css ? cs.css.join(', ') : 'none'}`);
  } else {
    console.log(`  ❌ No content scripts found`);
    allFilesExist = false;
  }
  
  // Check for hot-reload in production
  if (manifest.web_accessible_resources) {
    console.log(`  ⚠️  Warning: web_accessible_resources found (should not be in production)`);
  } else {
    console.log(`  ✅ No hot-reload resources (production build)`);
  }
  
} catch (error) {
  console.log(`  ❌ Error parsing manifest: ${error.message}`);
  allFilesExist = false;
}

// Check file contents
console.log('\n📝 Checking file contents:');

// Check content.js
const contentJsPath = path.join(DIST_DIR, 'content.js');
if (fs.existsSync(contentJsPath)) {
  const content = fs.readFileSync(contentJsPath, 'utf8');
  const isMinified = content.length < 20000 && !content.includes('\n  '); // Rough check
  console.log(`  ${isMinified ? '✅' : '⚠️ '} content.js ${isMinified ? 'is minified' : 'might not be minified'}`);
  
  if (content.includes('WebSocket')) {
    console.log(`  ⚠️  Warning: WebSocket code found in content.js (might cause errors)`);
  } else {
    console.log(`  ✅ No WebSocket code in content.js`);
  }
}

// Check CSS
const cssPath = path.join(DIST_DIR, 'assets/content.css');
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  const hasStyles = css.includes('.latka-sidebar');
  console.log(`  ${hasStyles ? '✅' : '❌'} CSS contains sidebar styles`);
}

console.log('\n🎯 Summary:');
if (allFilesExist) {
  console.log('✅ Extension appears to be valid and ready to load!');
  console.log('\n📋 Next steps:');
  console.log('1. Open Chrome and go to chrome://extensions/');
  console.log('2. Enable "Developer mode"');
  console.log('3. Click "Load unpacked" and select the "dist" folder');
  console.log('4. Test on https://getlatka.com/saas-companies');
} else {
  console.log('❌ Extension has issues. Please rebuild with "npm run build"');
}

console.log('');
