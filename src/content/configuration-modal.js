// Configuration Modal functionality for Latka Data Scraper
import '../assets/configuration-modal.css';

// Apps Script Integration Functions
export function getAppsScriptUrl() {
  return localStorage.getItem('latka-apps-script-url');
}

export function setAppsScriptUrl(url) {
  localStorage.setItem('latka-apps-script-url', url);
}

export function initializeGoogleSheetsUI() {
  const appsScriptUrl = getAppsScriptUrl();
  const sheetsText = document.getElementById('sheets-text');
  const configureBtn = document.getElementById('configure-sheets');

  // Auto-configure with default App Script URL if not set
  if (!appsScriptUrl) {
    const defaultAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbyUsdQZIeyGPNWTsETzkEXZHoDTIWenZYehgqxjG5hUFuIKAlUl-03ZqmeKZBJQ7wjOgw/exec';
    setAppsScriptUrl(defaultAppsScriptUrl);

    sheetsText.textContent = 'Ready to export';
    configureBtn.textContent = 'Settings';
    configureBtn.classList.add('connected');
  } else {
    sheetsText.textContent = 'Ready to export';
    configureBtn.textContent = 'Settings';
    configureBtn.classList.add('connected');
  }
}

export function showGoogleSheetsModal() {
  const currentAppsScriptUrl = getAppsScriptUrl();
  const defaultAppsScriptUrl = currentAppsScriptUrl || 'https://script.google.com/macros/s/AKfycbyUsdQZIeyGPNWTsETzkEXZHoDTIWenZYehgqxjG5hUFuIKAlUl-03ZqmeKZBJQ7wjOgw/exec';

  const modal = document.createElement('div');
  modal.className = 'export-config-modal';
  modal.id = 'export-modal';

  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-container">
      <div class="modal-header">
        <div class="header-content">
          <div class="header-icon">⚡</div>
          <div class="header-text">
            <h2>Export Configuration</h2>
            <p>Configure your Google Apps Script for seamless data export</p>
          </div>
        </div>
        <button class="close-btn" id="close-modal">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zM4.646 5.354a.5.5 0 0 1 .708-.708L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354z"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="config-section">
          <label class="input-label">Apps Script URL</label>
          <div class="input-wrapper">
            <input
              type="url"
              id="apps-script-url"
              class="url-input"
              placeholder="https://script.google.com/macros/s/.../exec"
              value="${defaultAppsScriptUrl}"
            >
            <button id="test-connection" class="test-btn" title="Test Connection">
              <span class="test-icon">🔗</span>
            </button>
          </div>
          <p class="input-help">Your Google Apps Script web app deployment URL</p>
        </div>

        <div class="config-section">
          <div class="checkbox-wrapper">
            <label class="checkbox-label">
              <input type="checkbox" id="clear-sheet" checked class="checkbox-input">
              <span class="checkbox-text">Clear existing data before export</span>
            </label>
          </div>
          <p class="input-help">Uncheck to append data to existing content</p>
        </div>

        <div class="status-section" id="status-section" style="display: none;">
          <div class="status-message" id="status-message"></div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="button-group">
          <button id="test-full-connection" class="btn-secondary">Test Connection</button>
          <button id="save-config" class="btn-primary">Save & Apply</button>
        </div>
        ${currentAppsScriptUrl ? '<button id="reset-config" class="btn-danger-link">Reset Configuration</button>' : ''}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  document.getElementById('close-modal').addEventListener('click', closeExportModal);
  document.getElementById('save-config').addEventListener('click', saveExportConfig);
  document.getElementById('test-full-connection').addEventListener('click', testConnectionFull);
  document.getElementById('test-connection').addEventListener('click', testConnectionQuick);

  if (currentAppsScriptUrl) {
    document.getElementById('reset-config').addEventListener('click', resetExportConfig);
  }

  // Close on overlay click
  modal.querySelector('.modal-overlay').addEventListener('click', closeExportModal);

  // Focus the URL input
  document.getElementById('apps-script-url').focus();

  // Add escape key handler
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeExportModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

function closeExportModal() {
  const modal = document.getElementById('export-modal');
  if (modal) modal.remove();
}

async function testConnectionQuick() {
  const appsScriptInput = document.getElementById('apps-script-url');
  const testBtn = document.getElementById('test-connection');

  const appsScriptUrl = appsScriptInput.value.trim();

  if (!appsScriptUrl) {
    showExportStatus('Please enter an Apps Script Web App URL', 'error');
    return;
  }

  testBtn.innerHTML = '⏳';
  testBtn.disabled = true;

  try {
    const testData = [['Test', 'Connection', 'Success']];
    const result = await exportViaAppsScript(testData, appsScriptUrl, { clear: false });

    if (result.ok) {
      testBtn.innerHTML = '✅';
      setTimeout(() => {
        testBtn.innerHTML = '🔗';
        testBtn.disabled = false;
      }, 2000);
    } else {
      testBtn.innerHTML = '❌';
      showExportStatus(`Connection failed: ${result.error || 'Unknown error'}`, 'error');
      setTimeout(() => {
        testBtn.innerHTML = '🔗';
        testBtn.disabled = false;
      }, 3000);
    }
  } catch (error) {
    // For no-cors mode, we might not get detailed error info
    if (error.message.includes('Failed to fetch')) {
      testBtn.innerHTML = '⚠️';
      showExportStatus('Connection test completed (no-cors mode). Export should still work.', 'info');
    } else {
      testBtn.innerHTML = '❌';
      showExportStatus('Connection test failed: ' + error.message, 'error');
    }
    setTimeout(() => {
      testBtn.innerHTML = '🔗';
      testBtn.disabled = false;
    }, 3000);
  }
}

async function testConnectionFull() {
  const appsScriptInput = document.getElementById('apps-script-url');
  const testBtn = document.getElementById('test-full-connection');

  const appsScriptUrl = appsScriptInput.value.trim();

  if (!appsScriptUrl) {
    showExportStatus('Please enter an Apps Script Web App URL', 'error');
    return;
  }

  testBtn.innerHTML = 'Testing...';
  testBtn.disabled = true;

  try {
    const testData = [['Test', 'Connection', 'Success']];
    const result = await exportViaAppsScript(testData, appsScriptUrl, { clear: false });

    if (result.ok) {
      showExportStatus('✅ Connection successful! Ready to export data.', 'success');
    } else {
      showExportStatus(`❌ Connection failed: ${result.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showExportStatus('❌ Connection test failed: ' + error.message, 'error');
  }

  testBtn.innerHTML = 'Test Connection';
  testBtn.disabled = false;
}

function saveExportConfig() {
  const appsScriptInput = document.getElementById('apps-script-url');
  const clearSheetCheckbox = document.getElementById('clear-sheet');
  const appsScriptUrl = appsScriptInput.value.trim();
  const clearSheet = clearSheetCheckbox.checked;

  if (!appsScriptUrl) {
    showExportStatus('Please enter an Apps Script Web App URL', 'error');
    return;
  }

  if (!isValidAppsScriptUrl(appsScriptUrl)) {
    showExportStatus('Please enter a valid Apps Script Web App URL', 'error');
    return;
  }

  setAppsScriptUrl(appsScriptUrl);
  localStorage.setItem('latka-clear-sheet', clearSheet.toString());

  initializeGoogleSheetsUI();
  showExportStatus('✅ Configuration saved successfully!', 'success');

  setTimeout(() => {
    closeExportModal();
  }, 1500);
}

function resetExportConfig() {
  localStorage.removeItem('latka-apps-script-url');
  localStorage.removeItem('latka-clear-sheet');
  initializeGoogleSheetsUI();
  showExportStatus('🗑️ Configuration reset successfully', 'info');

  setTimeout(() => {
    closeExportModal();
  }, 1500);
}

function showExportStatus(message, type) {
  const statusSection = document.getElementById('status-section');
  const statusMessage = document.getElementById('status-message');

  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusSection.style.display = 'block';

  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      statusSection.style.display = 'none';
    }, 3000);
  }
}


function isValidAppsScriptUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'script.google.com' && 
           url.includes('/macros/s/') && 
           url.endsWith('/exec');
  } catch {
    return false;
  }
}



function convertDataToCSV(data) {
  if (data.length === 0) return '';
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create header row
  const headerRow = headers.map(header => {
    if (header.includes(',') || header.includes('"') || header.includes('\n')) {
      return '"' + header.replace(/"/g, '""') + '"';
    }
    return header;
  }).join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      let text = row[header] || '';
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        text = '"' + text.replace(/"/g, '""') + '"';
      }
      return text;
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

async function exportViaAppsScript(values, scriptUrl, { clear = false } = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'exportToGoogleSheets',
      data: values,
      scriptUrl: scriptUrl,
      options: { clear }
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response.success) {
        resolve(response.result);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

// Expose functions to global scope for integration with other modules
window.getAppsScriptUrl = getAppsScriptUrl;
window.setAppsScriptUrl = setAppsScriptUrl;
window.initializeGoogleSheetsUI = initializeGoogleSheetsUI;
window.showGoogleSheetsModal = showGoogleSheetsModal;
