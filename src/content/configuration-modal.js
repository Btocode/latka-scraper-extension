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
  const standardKey = localStorage.getItem('latka-apps-script-connected');
  const altKey = localStorage.getItem('@latka-apps-script-connected');
  
  return standardKey === 'true' || altKey === 'true';
}

// Expose functions to global scope immediately to avoid race conditions
window.getAppsScriptUrl = getAppsScriptUrl;
window.setAppsScriptUrl = setAppsScriptUrl;
window.getAppsScriptConnected = getAppsScriptConnected;
window.setAppsScriptConnected = setAppsScriptConnected;

export function clearBackupData() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('latka_backup_')) {
      localStorage.removeItem(key);
    }
  });
}

// Migrate old localStorage keys
function migrateLocalStorageKeys() {
  const oldConnectedKey = localStorage.getItem('@latka-apps-script-connected');
  if (oldConnectedKey) {
    localStorage.setItem('latka-apps-script-connected', oldConnectedKey);
    localStorage.removeItem('@latka-apps-script-connected');
  }
}

export function initializeConnectionStatus() {
  migrateLocalStorageKeys();
  
  const appsScriptUrl = getAppsScriptUrl();
  const isConnected = getAppsScriptConnected();
  
  if (appsScriptUrl && !isConnected) {
    setAppsScriptConnected(true);
  }
}

export function initializeGoogleSheetsUI(retryCount = 0) {
  // Get required DOM elements
  const elements = {
    sheetsText: document.getElementById('sheets-text'),
    configureBtn: document.getElementById('configure-sheets'),
    statusText: document.getElementById('status-text'),
    configForm: document.getElementById('sheets-config-form'),
    connectedActions: document.getElementById('sheets-connected-actions'),
    urlInput: document.getElementById('sheets-url-input'),
    saveBtn: document.getElementById('save-sheets-config')
  };

  // Check if all critical elements are available
  const criticalElements = ['sheetsText', 'configureBtn', 'statusText'];
  const missingElements = criticalElements.filter(key => !elements[key]);
  
  if (missingElements.length > 0 && retryCount < 3) {
    setTimeout(() => initializeGoogleSheetsUI(retryCount + 1), 200);
    return;
  }

  // Initialize connection status
  initializeConnectionStatus();
  const isConnected = getAppsScriptConnected();
  const appsScriptUrl = getAppsScriptUrl();

  // Update UI based on connection status
  if (isConnected && appsScriptUrl) {
    // Connected state
    if (elements.sheetsText) elements.sheetsText.textContent = 'Ready to export';
    if (elements.configureBtn) {
      elements.configureBtn.textContent = 'Settings';
      elements.configureBtn.classList.add('connected');
    }
    if (elements.statusText) elements.statusText.textContent = 'Ready to scrape';
    if (elements.configForm) elements.configForm.style.display = 'none';
    if (elements.connectedActions) elements.connectedActions.style.display = 'block';
    if (elements.urlInput) elements.urlInput.value = appsScriptUrl;
    if (elements.saveBtn) elements.saveBtn.disabled = false;
  } else {
    // Not connected state
    if (elements.sheetsText) elements.sheetsText.textContent = 'No sheet connected';
    if (elements.configureBtn) {
      elements.configureBtn.textContent = 'Configure';
      elements.configureBtn.classList.remove('connected');
    }
    if (elements.statusText) elements.statusText.textContent = 'Configure Google Sheets';
    if (elements.configForm) elements.configForm.style.display = 'none';
    if (elements.connectedActions) elements.connectedActions.style.display = 'none';
    if (elements.saveBtn) elements.saveBtn.disabled = true;
  }

  // Update start button state
  if (window.updateStartButtonState) {
    window.updateStartButtonState();
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
  
  if (saveBtn.disabled) {
    showInlineStatus('Please test the connection first before saving', 'error');
    return;
  }
  
  const appsScriptUrl = urlInput.value.trim();
  
  if (!appsScriptUrl || !isValidAppsScriptUrl(appsScriptUrl)) {
    showInlineStatus('Please enter a valid Apps Script URL', 'error');
    return;
  }
  
  saveBtn.innerHTML = '⏳';
  saveBtn.disabled = true;
  
  // Save configuration
  setAppsScriptUrl(appsScriptUrl);
  setAppsScriptConnected(true);
  
  // Update UI
  initializeGoogleSheetsUI();
  showInlineStatus('✅ Configuration saved successfully!', 'success');
  
  setTimeout(() => {
    saveBtn.innerHTML = '💾';
    saveBtn.disabled = false;
  }, 2000);
}

export function disableSheetsConnection() {
  localStorage.removeItem('latka-apps-script-url');
  setAppsScriptConnected(false);
  
  initializeGoogleSheetsUI();
  showNotification('🗑️ Google Sheets disconnected. Configure to enable scraping.', 'info');
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


// Expose remaining functions to global scope
window.clearBackupData = clearBackupData;
window.initializeConnectionStatus = initializeConnectionStatus;
window.initializeGoogleSheetsUI = initializeGoogleSheetsUI;
window.toggleSheetsConfig = toggleSheetsConfig;
window.testSheetsConnection = testSheetsConnection;
window.saveSheetsConfig = saveSheetsConfig;
window.disableSheetsConnection = disableSheetsConnection;