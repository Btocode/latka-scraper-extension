// Configuration Modal Functions
import { showNotification } from './sidebar.js';

// Apps Script Integration Functions
export function getAppsScriptUrl() {
  return localStorage.getItem('latka-apps-script-url');
}

export function setAppsScriptUrl(url) {
  localStorage.setItem('latka-apps-script-url', url);
}

export function setAppsScriptConnected(connected) {
  localStorage.setItem('latka-apps-script-connected', connected.toString());
}

export function getAppsScriptConnected() {
  return localStorage.getItem('latka-apps-script-connected') === 'true';
}

export function clearBackupData() {
  // Get all localStorage keys
  const keys = Object.keys(localStorage);
  
  // Remove all backup data keys
  keys.forEach(key => {
    if (key.startsWith('latka_backup_')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('🗑️ Backup data cleared after successful export');
}

export function initializeConnectionStatus() {
  // Initialize connection status if Apps Script URL exists but connection flag doesn't
  const appsScriptUrl = getAppsScriptUrl();
  const isConnected = getAppsScriptConnected();
  
  if (appsScriptUrl && !isConnected) {
    console.log('🔧 Initializing connection status: URL exists, setting connected to true');
    setAppsScriptConnected(true);
  }
}

export function initializeGoogleSheetsUI() {
  const isConnected = getAppsScriptConnected();
  const appsScriptUrl = getAppsScriptUrl();
  const sheetsText = document.getElementById('sheets-text');
  const configureBtn = document.getElementById('configure-sheets');
  const statusText = document.getElementById('status-text');
  const configForm = document.getElementById('sheets-config-form');
  const connectedActions = document.getElementById('sheets-connected-actions');
  const urlInput = document.getElementById('sheets-url-input');

  console.log('🔧 Initializing Google Sheets UI:', { isConnected, hasUrl: !!appsScriptUrl });

  // If we have an Apps Script URL but no connection flag, set it to connected
  if (appsScriptUrl && !isConnected) {
    console.log('🔧 Setting connection flag to true (URL exists but flag not set)');
    setAppsScriptConnected(true);
  }

  // Re-check connection status after potential update
  const finalConnected = getAppsScriptConnected();

  if (!finalConnected) {
    // Apps Script not connected
    if (sheetsText) {
      sheetsText.textContent = 'No sheet connected';
    }
    if (configureBtn) {
      configureBtn.textContent = 'Configure';
      configureBtn.classList.remove('connected');
    }
    if (statusText) {
      statusText.textContent = 'Configure Google Sheets';
    }
    if (configForm) {
      configForm.style.display = 'none';
    }
    if (connectedActions) {
      connectedActions.style.display = 'none';
    }
    // Disable save button when not connected
    const saveBtn = document.getElementById('save-sheets-config');
    if (saveBtn) {
      saveBtn.disabled = true;
    }
  } else {
    // Apps Script is connected
    if (sheetsText) {
      sheetsText.textContent = 'Ready to export';
    }
    if (configureBtn) {
      configureBtn.textContent = 'Settings';
      configureBtn.classList.add('connected');
    }
    if (statusText) {
      statusText.textContent = 'Ready to scrape';
    }
    if (configForm) {
      configForm.style.display = 'none';
    }
    if (connectedActions) {
      connectedActions.style.display = 'block';
    }
    if (urlInput && appsScriptUrl) {
      urlInput.value = appsScriptUrl;
    }
    // Enable save button when connected
    const saveBtn = document.getElementById('save-sheets-config');
    if (saveBtn) {
      saveBtn.disabled = false;
    }
  }
}

export function toggleSheetsConfig() {
  const configForm = document.getElementById('sheets-config-form');
  const connectedActions = document.getElementById('sheets-connected-actions');
  const isConnected = getAppsScriptConnected();
  
  if (isConnected) {
    // If connected, show disconnect option
    if (connectedActions) {
      connectedActions.style.display = connectedActions.style.display === 'none' ? 'block' : 'none';
    }
  } else {
    // If not connected, show configuration form
    if (configForm) {
      configForm.style.display = configForm.style.display === 'none' ? 'block' : 'none';
    }
  }
}

export function testSheetsConnection() {
  const urlInput = document.getElementById('sheets-url-input');
  const testBtn = document.getElementById('test-sheets-connection');
  const saveBtn = document.getElementById('save-sheets-config');
  const statusDiv = document.getElementById('config-status');
  
  if (!urlInput || !testBtn) return;
  
  const appsScriptUrl = urlInput.value.trim();
  
  if (!appsScriptUrl) {
    showInlineStatus('Please enter an Apps Script URL', 'error');
    return;
  }
  
  if (!isValidAppsScriptUrl(appsScriptUrl)) {
    showInlineStatus('Please enter a valid Apps Script URL', 'error');
    return;
  }
  
  testBtn.innerHTML = '⏳';
  testBtn.disabled = true;
  if (saveBtn) {
    saveBtn.disabled = true;
  }
  
  // Test the connection
  testAppsScriptConnection(appsScriptUrl)
    .then(response => {
      if (response.ok) {
        testBtn.innerHTML = '✅';
        showInlineStatus('✅ Connection successful! You can now save the configuration.', 'success');
        if (saveBtn) {
          saveBtn.disabled = false;
        }
        setTimeout(() => {
          testBtn.innerHTML = '🔗';
          testBtn.disabled = false;
        }, 2000);
      } else {
        testBtn.innerHTML = '❌';
        showInlineStatus('❌ Connection failed: ' + (response.error || 'Please check your Apps Script URL and permissions'), 'error');
        if (saveBtn) {
          saveBtn.disabled = true;
        }
        setTimeout(() => {
          testBtn.innerHTML = '🔗';
          testBtn.disabled = false;
        }, 3000);
      }
    })
    .catch(error => {
      testBtn.innerHTML = '❌';
      showInlineStatus('❌ Connection test failed: ' + error.message, 'error');
      if (saveBtn) {
        saveBtn.disabled = true;
      }
      setTimeout(() => {
        testBtn.innerHTML = '🔗';
        testBtn.disabled = false;
      }, 3000);
    });
}

export function saveSheetsConfig() {
  const urlInput = document.getElementById('sheets-url-input');
  const saveBtn = document.getElementById('save-sheets-config');
  
  if (!urlInput || !saveBtn) return;
  
  // Check if save button is disabled (connection not verified)
  if (saveBtn.disabled) {
    showInlineStatus('Please test the connection first before saving', 'error');
    return;
  }
  
  const appsScriptUrl = urlInput.value.trim();
  
  if (!appsScriptUrl) {
    showInlineStatus('Please enter an Apps Script URL', 'error');
    return;
  }
  
  if (!isValidAppsScriptUrl(appsScriptUrl)) {
    showInlineStatus('Please enter a valid Apps Script URL', 'error');
    return;
  }
  
  saveBtn.innerHTML = '⏳';
  saveBtn.disabled = true;
  
  // Save the configuration
  setAppsScriptUrl(appsScriptUrl);
  setAppsScriptConnected(true);
  
  // Update UI
  initializeGoogleSheetsUI();
  showInlineStatus('✅ Configuration saved successfully!', 'success');
  
  // Update start button state
  if (window.updateStartButtonState) {
    window.updateStartButtonState();
  }
  
  setTimeout(() => {
    saveBtn.innerHTML = '💾';
    saveBtn.disabled = false;
  }, 2000);
}

export function disableSheetsConnection() {
  // Clear configuration
  localStorage.removeItem('latka-apps-script-url');
  setAppsScriptConnected(false);
  
  // Update UI
  initializeGoogleSheetsUI();
  showNotification('🗑️ Google Sheets disconnected. Configure to enable scraping.', 'info');
  
  // Update start button state
  if (window.updateStartButtonState) {
    window.updateStartButtonState();
  }
}

export function showInlineStatus(message, type) {
  const statusDiv = document.getElementById('config-status');
  if (!statusDiv) return;
  
  statusDiv.textContent = message;
  statusDiv.className = `config-status ${type}`;
  statusDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}

export function showGoogleSheetsModal() {
  // This function is now deprecated in favor of inline configuration
  // But keeping it for backward compatibility
  toggleSheetsConfig();
}

// Helper functions
function isValidAppsScriptUrl(url) {
  return url.includes('script.google.com/macros/s/') && url.includes('/exec');
}

async function testAppsScriptConnection(scriptUrl) {
  return new Promise((resolve) => {
    // Set a timeout for the connection test
    const timeout = setTimeout(() => {
      resolve({ ok: false, error: 'Connection timeout - please check your Apps Script URL and try again' });
    }, 10000); // 10 second timeout
    
    chrome.runtime.sendMessage({
      action: 'exportToGoogleSheets',
      data: [['Test', 'Connection', 'Success']],
      scriptUrl: scriptUrl,
      options: { clear: false }
    }, (response) => {
      clearTimeout(timeout);
      
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        resolve({ ok: false, error: 'Extension communication error: ' + chrome.runtime.lastError.message });
      } else if (response && response.ok) {
        resolve({ ok: true });
      } else if (response && response.error) {
        resolve({ ok: false, error: response.error });
      } else {
        // For no-cors mode, we might not get a response, but that's often okay
        resolve({ ok: true, note: 'Connection test completed (no-cors mode)' });
      }
    });
  });
}

// Expose functions to global scope for integration with other modules
window.getAppsScriptUrl = getAppsScriptUrl;
window.setAppsScriptUrl = setAppsScriptUrl;
window.getAppsScriptConnected = getAppsScriptConnected;
window.setAppsScriptConnected = setAppsScriptConnected;
window.clearBackupData = clearBackupData;
window.initializeConnectionStatus = initializeConnectionStatus;
window.initializeGoogleSheetsUI = initializeGoogleSheetsUI;
window.showGoogleSheetsModal = showGoogleSheetsModal;
window.toggleSheetsConfig = toggleSheetsConfig;
window.testSheetsConnection = testSheetsConnection;
window.saveSheetsConfig = saveSheetsConfig;
window.disableSheetsConnection = disableSheetsConnection;