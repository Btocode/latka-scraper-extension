#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Latka Scraper Development Environment...\n');

// Start webpack dev server
const webpack = spawn('npx', ['webpack', '--mode', 'development', '--watch'], {
  stdio: 'inherit',
  shell: true
});

// Start hot-reload server
const hotReload = spawn('node', ['dev-server.js'], {
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development servers...');
  webpack.kill();
  hotReload.kill();
  process.exit(0);
});

// Handle errors
webpack.on('error', (err) => {
  console.error('Webpack error:', err);
});

hotReload.on('error', (err) => {
  console.error('Hot-reload server error:', err);
});

console.log('✅ Development environment started!');
console.log('📦 Webpack: Building and watching for changes');
console.log('🔥 Hot-reload: Server running on ws://localhost:8890');
console.log('📁 Load the "dist" folder in Chrome Extensions');
console.log('\nPress Ctrl+C to stop all servers\n');
