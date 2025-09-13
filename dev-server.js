#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const chokidar = require('chokidar');

const PORT = 8890;
const wss = new WebSocket.Server({ port: PORT });

console.log(`🔥 Hot reload server running on ws://localhost:${PORT}`);

const extensionPath = __dirname;
const watchPaths = [
  path.join(extensionPath, '*.js'),
  path.join(extensionPath, '*.css'),
  path.join(extensionPath, '*.html'),
  path.join(extensionPath, 'manifest.json')
];

const watcher = chokidar.watch(watchPaths, {
  ignored: ['dev-server.js', 'hot-reload.js', 'node_modules/**'],
  persistent: true
});

watcher.on('change', (filePath) => {
  const fileName = path.basename(filePath);
  console.log(`📝 File changed: ${fileName}`);
  
  // Broadcast reload message to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'reload', file: fileName }));
    }
  });
});

wss.on('connection', (ws) => {
  console.log('🔌 Hot reload client connected');
  
  ws.on('close', () => {
    console.log('🔌 Hot reload client disconnected');
  });
});

console.log('👀 Watching files for changes...');
console.log('📁 Extension path:', extensionPath);
console.log('🎯 Watching:', watchPaths.map(p => path.basename(p)).join(', '));