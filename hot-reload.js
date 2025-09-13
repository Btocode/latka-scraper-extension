// Hot reload functionality for development
const WEBSOCKET_PORT = 8890;
let websocket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectWebSocket() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.log('🔥 Max reconnection attempts reached. Hot reload disabled.');
    return;
  }

  try {
    websocket = new WebSocket(`ws://localhost:${WEBSOCKET_PORT}`);
    
    websocket.onopen = function() {
      console.log('🔥 Hot reload connected');
      reconnectAttempts = 0; // Reset on successful connection
    };
    
    websocket.onmessage = function(event) {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'reload') {
          console.log('🔄 Reloading extension...');
          chrome.runtime.reload();
        }
      } catch (e) {
        console.warn('Hot reload: Invalid message received');
      }
    };
    
    websocket.onclose = function() {
      if (reconnectAttempts === 0) {
        console.log('🔥 Hot reload server not available. Extension will work without hot-reload.');
      }
      reconnectAttempts++;
      if (reconnectAttempts < maxReconnectAttempts) {
        setTimeout(connectWebSocket, 2000 * reconnectAttempts);
      }
    };
    
    websocket.onerror = function(error) {
      // Only log error on first attempt to avoid spam
      if (reconnectAttempts === 0) {
        console.log('🔥 Hot reload server not running. Extension will work normally.');
      }
    };
  } catch (error) {
    if (reconnectAttempts === 0) {
      console.log('🔥 Hot reload not available. Extension will work normally.');
    }
    reconnectAttempts++;
    if (reconnectAttempts < maxReconnectAttempts) {
      setTimeout(connectWebSocket, 2000 * reconnectAttempts);
    }
  }
}

// Only enable in development (unpacked extensions don't have a key)
if (chrome.runtime.getManifest && !chrome.runtime.getManifest().key) {
  connectWebSocket();
}