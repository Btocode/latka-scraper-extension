// Sidebar functionality for Latka Data Scraper
import '../assets/sidebar.css';

let sidebarVisible = false;
let sidebarElement = null;
let sidebarKeepOpen = false;

// Global variable to store scraped data
let scrapedTableData = [];
let hasScrapedData = false;

export function isTargetPage() {
  return window.location.href.includes('getlatka.com/saas-companies');
}

export function createSidebar() {
  if (sidebarElement) return sidebarElement;

  const sidebar = document.createElement('div');
  sidebar.id = 'latka-scraper-sidebar';
  sidebar.className = 'latka-sidebar hidden';
  
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h3>Latka Data Scraper</h3>
      <div class="header-controls">
        <button id="toggle-keep-open" class="toggle-btn">Keep Open</button>
        <button id="close-sidebar" class="close-btn">×</button>
      </div>
    </div>
    <div class="sidebar-content">
      <div class="status-section">
        <div class="section-title">Status</div>
        <div class="status-indicator">
          <span class="status-dot active"></span>
          <span class="status-text">Ready to scrape</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
      </div>
      
      <div class="actions-section">
        <div class="section-title">Actions</div>
        <div class="actions-grid" id="actions-grid">
          <button id="start-scraping" class="btn btn-primary">
            <span class="icon">⚡</span>Start Scraping
          </button>
        </div>
      </div>
      
      <div class="stats-section" id="stats-section" style="display: none;">
        <div class="section-title">Statistics</div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Companies</div>
            <span id="companies-count" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <div class="stat-label">Progress</div>
            <span id="progress-percent" class="stat-value">0%</span>
          </div>
        </div>
      </div>
      
      <div class="sheets-section" id="sheets-section" style="display: none;">
        <div class="section-title">Google Sheets</div>
        <div class="sheets-config">
          <div class="sheets-status" id="sheets-status">
            <span class="sheets-indicator">📊</span>
            <span class="sheets-text" id="sheets-text">No sheet connected</span>
            <button id="configure-sheets" class="configure-btn">Configure</button>
          </div>
        </div>
      </div>
      
      <div class="data-section" id="data-section" style="display: none;">
        <div class="section-title">
          Data Preview
          <a href="#" id="view-all-data" class="view-all-link" style="display: none;">View All</a>
        </div>
        <div id="scraped-data-preview" class="data-preview-container">
          <p class="placeholder">Loading data...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);
  sidebarElement = sidebar;

  return sidebar;
}

export function showSidebar() {
  if (!sidebarElement) {
    createSidebar();
  }
  
  // Adjust body padding to make room for sidebar
  document.body.style.paddingRight = '500px';
  document.body.style.transition = 'padding-right 0.3s ease';
  
  sidebarElement.classList.remove('hidden');
  sidebarVisible = true;
  
  // Update extension badge
  chrome.runtime.sendMessage({action: 'updateBadge', text: '●'});
}

export function hideSidebar() {
  if (sidebarElement) {
    sidebarElement.classList.add('hidden');
    document.body.style.paddingRight = '0';
    sidebarVisible = false;
    
    // Update extension badge
    chrome.runtime.sendMessage({action: 'updateBadge', text: ''});
  }
}

export function updateStatus(message, isActive = true) {
  const statusText = document.querySelector('.status-text');
  const statusDot = document.querySelector('.status-dot');
  
  if (statusText) statusText.textContent = message;
  if (statusDot) {
    statusDot.classList.toggle('active', isActive);
    statusDot.classList.toggle('loading', !isActive);
  }
}

function extractCellData(cell) {
  const cellData = {
    text: '',
    links: {}
  };
  
  // Extract text content (clean whitespace)
  cellData.text = cell.textContent.trim();
  
  // Extract all links in the cell
  const links = cell.querySelectorAll('a');
  links.forEach(link => {
    const href = link.href;
    const linkText = link.textContent.trim();
    
    // Categorize links based on domain or content
    if (href.includes('linkedin.com')) {
      cellData.links.linkedin = href;
    } else if (href.includes('youtube.com') || href.includes('youtu.be')) {
      cellData.links.youtube = href;
    } else if (href.includes('getlatka.com/people/')) {
      cellData.links.profile = href;
    } else if (href.includes('getlatka.com/companies/countries/') || href.includes('getlatka.com/companies/regions/')) {
      cellData.links.location = href;
    } else if (href.includes('getlatka.com/companies/industries/')) {
      cellData.links.industry = href;
    } else if (href.includes('getlatka.com')) {
      cellData.links.website = href;
    } else {
      // External website or other links
      if (!cellData.links.website && href.startsWith('http')) {
        cellData.links.website = href;
      }
    }
  });
  
  return cellData;
}

function scrapeLatkaTable() {
  const tables = Array.from(document.querySelectorAll('table'));
  const requestedColumns = [
    'Name',
    'company_links', // Column for comma-separated company links
    'Funding',
    'Valuation',
    'Growth',
    'Founder',
    'founder_links', // Column for comma-separated founder links
    'Team Size',
    'Founded',
    'Location',
    'Industry'
  ];

  const jsonDataWithAllLinks = [];

  // Assuming the first table is the main data table
  const mainTable = tables[0];
  if (!mainTable) {
    console.error("No table found on the page.");
    return [];
  }

  const rows = Array.from(mainTable.querySelectorAll('tr'));

  if (rows.length > 0) {
    const headers = Array.from(rows[0].querySelectorAll('th, td')).map(cell => cell.innerText.trim());

    // Process all data rows
    const rowsToProcess = rows.slice(1);

    rowsToProcess.forEach(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const rowData = {};

      requestedColumns.forEach(reqCol => {
          let cellIndex = -1;
          let cell = null;

          // Determine which table cell to look in based on the requested column
          if (reqCol === 'Name' || reqCol === 'company_links') {
              cellIndex = headers.indexOf('Name');
          } else if (reqCol === 'Founder' || reqCol === 'founder_links') {
               cellIndex = headers.indexOf('Founder');
          } else {
               cellIndex = headers.indexOf(reqCol);
          }

          if (cellIndex > -1 && cellIndex < cells.length) {
               cell = cells[cellIndex];

               if (reqCol === 'company_links') {
                  // Collect all link hrefs from the Name cell and join with comma
                  const links = Array.from(cell.querySelectorAll('a'));
                  rowData[reqCol] = links.map(link => link.href).join(',');

               } else if (reqCol === 'founder_links') {
                   // Collect all link hrefs from the Founder cell and join with comma
                  const links = Array.from(cell.querySelectorAll('a'));
                  rowData[reqCol] = links.map(link => link.href).join(',');

               }
              else {
                // For regular columns, just get the text content
                rowData[reqCol] = cell.innerText.trim();
              }
          } else {
               // If a requested column's base cell (Name/Founder or the direct column) is not found
               // Initialize the property with an empty string
               rowData[reqCol] = '';
          }
      });
       // Ensure all requested columns are in the output, adding empty strings if not found
      requestedColumns.forEach(col => {
        if (!rowData.hasOwnProperty(col)) {
             rowData[col] = '';
        }
      });
      jsonDataWithAllLinks.push(rowData);
    });
  }

  return jsonDataWithAllLinks;
}

export function startScraping() {
  updateStatus('Scraping in progress...', false);
  const startBtn = document.getElementById('start-scraping');
  const exportBtn = document.getElementById('export-data');
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  
  startBtn.disabled = true;
  startBtn.innerHTML = '<span class="loading-spinner"></span>Scraping...';
  
  // Simulate progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 10;
    progressFill.style.width = progress + '%';
    progressPercent.textContent = progress + '%';
    
    if (progress >= 100) {
      clearInterval(progressInterval);
    }
  }, 100);
  
  // Actual scraping logic
  setTimeout(() => {
    try {
      scrapedTableData = scrapeLatkaTable();
      
      if (scrapedTableData.length > 0) {
        // Display preview (first few rows)
        const previewData = scrapedTableData.slice(0, 5).map(row => {
          return {
            name: row.Name || 'N/A',
            revenue: row.Funding || 'N/A',
            teamSize: row['Team Size'] || 'N/A'
          };
        });
        
        displayScrapedData(previewData);
        updateStatus('Scraping completed', true);
        showDataSections();
        updateActionButtons(true);
        
        document.getElementById('companies-count').textContent = scrapedTableData.length;
        hasScrapedData = true;
      } else {
        updateStatus('No data found', false);
        displayScrapedData([]);
        hasScrapedData = false;
      }
    } catch (error) {
      updateStatus('Scraping failed', false);
      displayScrapedData([]);
      hasScrapedData = false;
    }
    
    startBtn.disabled = false;
    
  }, 1000);
}

export function showDataSections() {
  // Show data preview, statistics, and sheets sections
  document.getElementById('data-section').style.display = 'block';
  document.getElementById('stats-section').style.display = 'block';
  document.getElementById('sheets-section').style.display = 'block';
  
  // Initialize Google Sheets UI (will be handled by configuration modal module)
  if (window.initializeGoogleSheetsUI) {
    window.initializeGoogleSheetsUI();
  }
}

function updateActionButtons(hasData) {
  const actionsGrid = document.getElementById('actions-grid');
  const startBtn = document.getElementById('start-scraping');
  
  if (hasData) {
    // Update start button to rescrape
    startBtn.innerHTML = '<span class="icon">🔄</span>Rescrape';
    
    // Add export button if it doesn't exist
    let exportBtn = document.getElementById('export-data');
    if (!exportBtn) {
      exportBtn = document.createElement('button');
      exportBtn.id = 'export-data';
      exportBtn.className = 'btn btn-secondary';
      exportBtn.innerHTML = '<span class="icon">📤</span>Export';
      exportBtn.addEventListener('click', exportData);
      actionsGrid.appendChild(exportBtn);
    }
    exportBtn.disabled = false;
  } else {
    // Reset to start scraping
    startBtn.innerHTML = '<span class="icon">⚡</span>Start Scraping';
    
    // Remove export button if it exists
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
      exportBtn.remove();
    }
  }
}

function displayScrapedData(data) {
  const previewContainer = document.getElementById('scraped-data-preview');
  const viewAllLink = document.getElementById('view-all-data');
  
  if (data.length === 0) {
    previewContainer.innerHTML = '<p class="placeholder">No data found</p>';
    viewAllLink.style.display = 'none';
    return;
  }
  
  // Show only first 5 rows
  const limitedData = data.slice(0, 5);
  
  const tableHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Company</th>
          <th>Revenue</th>
          <th>Team Size</th>
        </tr>
      </thead>
      <tbody>
        ${limitedData.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.revenue}</td>
            <td>${item.teamSize}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  previewContainer.innerHTML = tableHTML;
  viewAllLink.style.display = 'inline';
}

async function exportData() {
  if (scrapedTableData.length === 0) {
    showNotification('No data to export. Please scrape data first.', 'warning');
    return;
  }
  
  const exportBtn = document.getElementById('export-data');
  const originalHTML = exportBtn.innerHTML;
  
  // Check if Apps Script is configured (will be handled by configuration modal module)
  const appsScriptUrl = window.getAppsScriptUrl ? window.getAppsScriptUrl() : null;

  if (!appsScriptUrl) {
    // Show configuration modal (will be handled by configuration modal module)
    if (window.showGoogleSheetsModal) {
      window.showGoogleSheetsModal();
    }
    return;
  }
  
  // Export to Google Sheets via Apps Script
  exportBtn.innerHTML = '<span class="loading-spinner"></span>Exporting...';
  exportBtn.disabled = true;
  
  try {
    const values = flattenToValues(scrapedTableData);
    const clearSheet = localStorage.getItem('latka-clear-sheet') === 'true';
    
    await exportViaAppsScript(values, appsScriptUrl, { clear: clearSheet });

    exportBtn.innerHTML = '<span class="icon success-icon">✓</span>Exported!';
    exportBtn.classList.add('success');

    // Show success notification
    const companyCount = values.length - 1; // Subtract header row
    showNotification(`✅ Successfully exported ${companyCount} companies to your Google Sheet!`, 'success');

    
  } catch (error) {
    exportBtn.innerHTML = '<span class="icon">❌</span>Failed';
    exportBtn.classList.add('error');
    showNotification('Export failed. Check Apps Script URL and permissions.', 'error');
  }
  
  setTimeout(() => {
    exportBtn.innerHTML = originalHTML;
    exportBtn.classList.remove('success', 'error');
    exportBtn.disabled = false;
  }, 3000);
}

export function showNotification(message, type = 'info') {
  // Create a temporary notification
  const notification = document.createElement('div');
  
  let backgroundColor;
  switch (type) {
    case 'success':
      backgroundColor = '#28a745';
      break;
    case 'error':
      backgroundColor = '#dc3545';
      break;
    case 'warning':
      backgroundColor = '#ffc107';
      break;
    default:
      backgroundColor = '#333';
  }
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${backgroundColor};
    color: ${type === 'warning' ? '#212529' : 'white'};
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
    font-weight: 500;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, type === 'error' ? 4000 : 2000); // Show errors longer
}

export function toggleKeepOpen() {
  sidebarKeepOpen = !sidebarKeepOpen;
  const toggleBtn = document.getElementById('toggle-keep-open');
  
  if (sidebarKeepOpen) {
    toggleBtn.textContent = 'Auto Close';
    toggleBtn.style.background = '#28a745';
    localStorage.setItem('latka-sidebar-keep-open', 'true');
  } else {
    toggleBtn.textContent = 'Keep Open';
    toggleBtn.style.background = '#ff6b35';
    localStorage.setItem('latka-sidebar-keep-open', 'false');
  }
}

// Load keep open preference
export function loadKeepOpenPreference() {
  const saved = localStorage.getItem('latka-sidebar-keep-open');
  sidebarKeepOpen = saved === 'true';
  
  if (sidebarKeepOpen && document.getElementById('toggle-keep-open')) {
    const toggleBtn = document.getElementById('toggle-keep-open');
    toggleBtn.textContent = 'Auto Close';
    toggleBtn.style.background = '#28a745';
  }
}

function flattenToValues(data) {
  // Convert scraped data to 2D array of text values for Google Sheets
  if (data.length === 0) return [];
  
  // Get column headers from the first row
  const headers = Object.keys(data[0]);
  
  // Create the result array starting with headers
  const result = [headers];
  
  // Add data rows
  data.forEach(row => {
    const rowValues = headers.map(header => row[header] || '');
    result.push(rowValues);
  });
  
  return result;
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

// Getters for data access from other modules
export function getScrapedTableData() {
  return scrapedTableData;
}

export function setScrapedTableData(data) {
  scrapedTableData = data;
}

export function getHasScrapedData() {
  return hasScrapedData;
}

export function getSidebarVisible() {
  return sidebarVisible;
}

export function getSidebarKeepOpen() {
  return sidebarKeepOpen;
}
