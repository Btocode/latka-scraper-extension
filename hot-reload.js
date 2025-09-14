// Hot reload functionality for development
const WEBSOCKET_PORT = 8890;
let websocket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;
let isDevelopment = false;

// Check if we're in development mode
function checkDevelopmentMode() {
  try {
    const manifest = chrome.runtime.getManifest();
    // Unpacked extensions don't have a key, indicating development
    isDevelopment = !manifest.key;
    return isDevelopment;
  } catch (e) {
    return false;
  }
}

function connectWebSocket() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.log('🔥 Hot reload: Max reconnection attempts reached. Working in production mode.');
    return;
  }

  try {
    websocket = new WebSocket(`ws://localhost:${WEBSOCKET_PORT}`);
    
    websocket.onopen = function() {
      console.log('🔥 Hot reload: Connected to development server');
      reconnectAttempts = 0;
    };
    
    websocket.onmessage = function(event) {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'reload') {
          console.log('🔄 Hot reload: Reloading extension...');
          chrome.runtime.reload();
        }
      } catch (e) {
        console.warn('Hot reload: Invalid message received');
      }
    };
    
    websocket.onclose = function() {
      if (reconnectAttempts === 0) {
        console.log('🔥 Hot reload: Development server not available. Extension working in production mode.');
      }
      reconnectAttempts++;
      if (reconnectAttempts < maxReconnectAttempts) {
        setTimeout(connectWebSocket, 3000 * reconnectAttempts);
      }
    };
    
    websocket.onerror = function(error) {
      // Silent error handling to avoid console spam
      if (reconnectAttempts === 0) {
        console.log('🔥 Hot reload: Development server not running. Extension working normally.');
      }
    };
  } catch (error) {
    if (reconnectAttempts === 0) {
      console.log('🔥 Hot reload: Not available. Extension working in production mode.');
    }
    reconnectAttempts++;
    if (reconnectAttempts < maxReconnectAttempts) {
      setTimeout(connectWebSocket, 3000 * reconnectAttempts);
    }
  }
}

// Only attempt connection in development mode
if (checkDevelopmentMode()) {
  // Delay initial connection to avoid immediate errors
  setTimeout(connectWebSocket, 1000);
}