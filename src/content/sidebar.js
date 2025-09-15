// Sidebar functionality for Latka Data Scraper
import '../assets/sidebar.css';

let sidebarVisible = false;
let sidebarElement = null;
let sidebarKeepOpen = false;

// Global variable to store scraped data
let scrapedTableData = [];
let hasScrapedData = false;
let isMultiPageScraping = false;
let currentPageIndex = 0;
let totalPagesToScrape = 1;
let allPagesData = [];

export function isTargetPage() {
  return window.location.href.includes('getlatka.com/saas-companies');
}

function getCurrentPageNumber() {
  try {
    const url = new URL(window.location.href);
    const pageParam = url.searchParams.get('page');
    return pageParam ? parseInt(pageParam) : 1;
  } catch (error) {
    console.error('Error parsing page number:', error);
    return 1;
  }
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
        <div class="page-config">
          <label for="page-count-input" class="page-label">Pages to scrape:</label>
          <div class="page-input-group">
            <input type="number" id="page-count-input" class="page-input" min="1" max="50" value="1" placeholder="1">
            <span class="page-info">Enter number of pages (1-50)</span>
          </div>
        </div>
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
            <div class="stat-label">Current Page</div>
            <span id="current-page" class="stat-value">0/0</span>
          </div>
          <div class="stat-item">
            <div class="stat-label">Progress</div>
            <span id="progress-percent" class="stat-value">0%</span>
          </div>
          <div class="stat-item">
            <div class="stat-label">Status</div>
            <span id="scraping-status" class="stat-value">Ready</span>
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
          <div class="export-options" id="export-options" style="display: none; margin-top: var(--space-4);">
            <div class="option-row">
              <label class="option-label">
                <input type="checkbox" id="export-per-page" class="option-checkbox">
                <span class="checkmark"></span>
                Export after each page
              </label>
            </div>
            <div class="option-row" style="margin-top: var(--space-3);">
              <label class="option-label">
                <input type="checkbox" id="auto-export-end" class="option-checkbox">
                <span class="checkmark"></span>
                Auto-export at completion (multi-page only)
              </label>
            </div>
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

export async function startScraping() {
  const pageCountInput = document.getElementById('page-count-input');
  const pagesToScrape = parseInt(pageCountInput.value) || 1;

  if (pagesToScrape < 1 || pagesToScrape > 50) {
    showNotification('Please enter a valid number of pages (1-50)', 'warning');
    return;
  }

  // Reset multi-page scraping state
  // Get the current page number from URL
  const startingPageNumber = getCurrentPageNumber();

  // Set up page range: if user wants 4 pages from page 3, scrape pages 3,4,5,6
  currentPageIndex = startingPageNumber; // Start from current page number
  totalPagesToScrape = startingPageNumber + pagesToScrape - 1; // End page number
  allPagesData = [];
  isMultiPageScraping = pagesToScrape > 1;

  console.log(`Multi-page setup: Starting from page ${startingPageNumber}, scraping ${pagesToScrape} pages (${startingPageNumber} to ${totalPagesToScrape})`);
  console.log(`Variables: currentPageIndex=${currentPageIndex}, totalPagesToScrape=${totalPagesToScrape}`);

  updateStatus(`Starting ${pagesToScrape > 1 ? 'multi-page' : 'single-page'} scraping...`, false);

  const startBtn = document.getElementById('start-scraping');
  startBtn.disabled = true;
  startBtn.innerHTML = '<span class="loading-spinner"></span>Scraping...';

  // Add cancel button for multi-page scraping
  if (isMultiPageScraping) {
    addCancelButton();
  }

  // Update UI to show statistics section
  showDataSections();
  updatePageProgress();

  // Save initial state before starting
  if (isMultiPageScraping) {
    try {
      await saveScrapingState();
    } catch (error) {
      console.error('Failed to save initial scraping state:', error);
    }
  }

  // Start scraping the first page
  scrapeCurrentPage();
}

async function scrapeCurrentPage() {
  try {
    const currentUrl = new URL(window.location.href);
    const currentPageNum = currentPageIndex; // currentPageIndex now holds the actual page number

    // Update status
    updateStatus(`Scraping page ${currentPageNum} of ${totalPagesToScrape}...`, false);
    updateScrapingStatus(`Page ${currentPageNum}/${totalPagesToScrape}`);
    updatePageProgress();

    // Scrape current page data
    const pageData = scrapeLatkaTable();

    if (pageData.length > 0) {
      // Ensure allPagesData is properly accumulated
      allPagesData = [...allPagesData, ...pageData];
      console.log(`Page ${currentPageNum}: Found ${pageData.length} companies. Total so far: ${allPagesData.length}`);

      // Export data after each page if configured
      if (shouldExportAfterEachPage()) {
        await exportPageData(pageData, currentPageNum);
      }

      // Update display with accumulated data
      updateDataDisplay();

      showNotification(`✅ Page ${currentPageNum} completed: ${pageData.length} companies`, 'success');
    } else {
      showNotification(`⚠️ Page ${currentPageNum}: No data found`, 'warning');
    }

    // Check if we need to scrape more pages
    if (currentPageIndex < totalPagesToScrape) {
      // Save state before creating next page tab
      try {
        await saveScrapingState();
        showNotification(`📋 Creating hidden tab for page ${currentPageIndex + 1}...`, 'info');
      } catch (error) {
        console.error('Failed to save scraping state:', error);
      }

      // Create hidden tab for next page
      setTimeout(async () => {
        try {
          await createNextPageTab();
        } catch (error) {
          showNotification(`❌ Failed to create hidden tab for page ${currentPageIndex + 1}`, 'error');
          completeMultiPageScraping();
        }
      }, 500);
    } else {
      // All pages completed
      completeMultiPageScraping();
    }

  } catch (error) {
    console.error('Error scraping page:', error);
    showNotification(`❌ Error scraping page ${currentPageIndex + 1}: ${error.message}`, 'error');
    completeMultiPageScraping();
  }
}

async function createNextPageTab() {
  try {
    const nextPageNum = currentPageIndex + 1;
    const baseUrl = window.location.origin + window.location.pathname;

    // Create simple URL for next page (no special parameters needed)
    const nextPageUrl = `${baseUrl}?page=${nextPageNum}`;

    console.log(`Attempting to create background tab for page ${nextPageNum}`, {
      url: nextPageUrl,
      currentPageIndex,
      totalPagesToScrape
    });

    // Create background tab via background script
    const result = await chrome.runtime.sendMessage({
      action: 'createHiddenScrapingTab',
      url: nextPageUrl
    });

    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to create background tab');
    }

    console.log(`Successfully created background tab for page ${nextPageNum}:`, result.result.tabId);
    return result.result.tabId;
  } catch (error) {
    console.error('Failed to create background tab:', error);
    showNotification(`❌ Failed to create background tab: ${error.message}`, 'error');
    throw error;
  }
}

async function getCurrentTabId() {
  try {
    // Ask background script for current tab ID
    const response = await chrome.runtime.sendMessage({
      action: 'getCurrentTabId'
    });

    if (response && response.success) {
      return response.tabId;
    } else {
      throw new Error('Failed to get current tab ID');
    }
  } catch (error) {
    console.error('Error getting current tab ID:', error);
    throw error;
  }
}

async function completeMultiPageScraping() {
  const startBtn = document.getElementById('start-scraping');

  // Clear scraping state as we're done
  try {
    await clearScrapingState();
  } catch (error) {
    console.error('Error clearing scraping state:', error);
  }

  // Clean up tab group
  try {
    const currentTabId = await getCurrentTabId();
    await chrome.runtime.sendMessage({
      action: 'cleanupScrapingGroup',
      primaryTabId: currentTabId
    });
  } catch (error) {
    console.error('Error cleaning up scraping group:', error);
  }

  // Update final status
  if (allPagesData.length > 0) {
    // Ensure we preserve the exact original data structure
    scrapedTableData = [...allPagesData];
    hasScrapedData = true;

    console.log(`Final scraping complete: ${scrapedTableData.length} total companies`);
    console.log('Sample data structure:', scrapedTableData[0]);
    updateStatus(`Scraping completed: ${allPagesData.length} companies from ${currentPageIndex} pages`, true);
    updateScrapingStatus('Completed');
    updateActionButtons(true);

    // Final export only if auto-export is enabled AND not exporting after each page
    if (!shouldExportAfterEachPage()) {
      // Check if we should auto-export at the end
      if (shouldAutoExport()) {
        exportAllData();
      }
    }

    showNotification(`🎉 Multi-page scraping complete! Collected ${allPagesData.length} companies from ${currentPageIndex} pages`, 'success');
  } else {
    updateStatus('No data found across all pages', false);
    updateScrapingStatus('No Data');
    hasScrapedData = false;
  }

  // Reset button
  startBtn.disabled = false;
  startBtn.innerHTML = hasScrapedData ?
    '<span class="icon">🔄</span>Rescrape' :
    '<span class="icon">⚡</span>Start Scraping';

  // Update progress bar to 100%
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  progressFill.style.width = '100%';
  progressPercent.textContent = '100%';

  // Reset multi-page state
  isMultiPageScraping = false;

  // Remove cancel button
  removeCancelButton();
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

  // Initialize export options
  initializeExportOptions();
}

function initializeExportOptions() {
  // Show export options if Google Sheets is configured
  const appsScriptUrl = window.getAppsScriptUrl ? window.getAppsScriptUrl() : null;
  const exportOptions = document.getElementById('export-options');

  if (appsScriptUrl && exportOptions) {
    exportOptions.style.display = 'block';

    // Set up event listener for export per page checkbox
    const exportPerPageCheckbox = document.getElementById('export-per-page');
    if (exportPerPageCheckbox && !exportPerPageCheckbox.hasAttribute('data-listener')) {
      // Load saved preference
      exportPerPageCheckbox.checked = localStorage.getItem('latka-export-per-page') === 'true';

      // Add change listener
      exportPerPageCheckbox.addEventListener('change', (e) => {
        localStorage.setItem('latka-export-per-page', e.target.checked);
        showNotification(
          e.target.checked ?
          '✅ Will export data after each page' :
          '📋 Will wait for manual export or end completion',
          'info'
        );
      });

      exportPerPageCheckbox.setAttribute('data-listener', 'true');
    }

    // Set up event listener for auto-export at end checkbox
    const autoExportEndCheckbox = document.getElementById('auto-export-end');
    if (autoExportEndCheckbox && !autoExportEndCheckbox.hasAttribute('data-listener')) {
      // Load saved preference
      autoExportEndCheckbox.checked = localStorage.getItem('latka-auto-export') === 'true';

      // Add change listener
      autoExportEndCheckbox.addEventListener('change', (e) => {
        localStorage.setItem('latka-auto-export', e.target.checked);
        showNotification(
          e.target.checked ?
          '✅ Will auto-export when all pages complete' :
          '📋 Will show export button when complete',
          'info'
        );
      });

      autoExportEndCheckbox.setAttribute('data-listener', 'true');
    }
  }
}

function updateActionButtons(hasData) {
  const actionsGrid = document.getElementById('actions-grid');
  const startBtn = document.getElementById('start-scraping');

  if (hasData) {
    // Update start button to rescrape
    startBtn.innerHTML = '<span class="icon">🔄</span>Rescrape';

    // Only show export button if:
    // 1. Single page scraping (totalPagesToScrape === 1), OR
    // 2. Multi-page scraping is complete AND auto-export is OFF
    const shouldShowExportButton = totalPagesToScrape === 1 || (!isMultiPageScraping && !shouldExportAfterEachPage());

    if (shouldShowExportButton) {
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
      // Remove export button if auto-export is enabled for multi-page
      const exportBtn = document.getElementById('export-data');
      if (exportBtn) {
        exportBtn.remove();
      }
    }
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
  const dataToExport = isMultiPageScraping && allPagesData.length > 0 ? allPagesData : scrapedTableData;

  if (dataToExport.length === 0) {
    showNotification('No data to export. Please scrape data first.', 'warning');
    return;
  }

  console.log(`Exporting ${dataToExport.length} companies`);
  
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
    const values = flattenToValues(dataToExport);
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

// Helper functions for multi-page scraping

function updatePageProgress() {
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const currentPageEl = document.getElementById('current-page');

  // Get the starting page number and calculate progress
  const startingPageNumber = getCurrentPageNumber();
  const totalPagesRequested = totalPagesToScrape - startingPageNumber + 1;
  const pagesCompleted = Math.max(0, currentPageIndex - startingPageNumber + 1);

  if (totalPagesRequested > 0) {
    const progress = (pagesCompleted / totalPagesRequested) * 100;
    progressFill.style.width = progress + '%';
    progressPercent.textContent = Math.round(progress) + '%';
  }

  if (currentPageEl) {
    currentPageEl.textContent = `${pagesCompleted}/${totalPagesRequested} pages`;
  }
}

function updateScrapingStatus(status) {
  const statusEl = document.getElementById('scraping-status');
  if (statusEl) {
    statusEl.textContent = status;
  }
}

function updateDataDisplay() {
  // Update companies count
  const totalCount = allPagesData.length;
  document.getElementById('companies-count').textContent = totalCount;

  // Display preview of all accumulated data (maintain original structure)
  const previewData = allPagesData.slice(0, 5).map(row => {
    return {
      name: row.Name || 'N/A',
      revenue: row.Funding || 'N/A',
      teamSize: row['Team Size'] || 'N/A'
    };
  });

  displayScrapedData(previewData);

  console.log(`Updated display: ${totalCount} companies total`);
}

function shouldExportAfterEachPage() {
  // Check if user wants to export after each page (stored in localStorage)
  return localStorage.getItem('latka-export-per-page') === 'true';
}

function shouldAutoExport() {
  // Check if user wants to auto-export at the end
  return localStorage.getItem('latka-auto-export') === 'true';
}

async function exportPageData(pageData, pageNumber) {
  const appsScriptUrl = window.getAppsScriptUrl ? window.getAppsScriptUrl() : null;

  if (!appsScriptUrl) {
    showNotification('⚠️ No Google Sheets configured for export', 'warning');
    return;
  }

  try {
    const values = flattenToValues(pageData);
    const clearSheet = pageNumber === 1; // Only clear on first page

    await exportViaAppsScript(values, appsScriptUrl, { clear: clearSheet });
    showNotification(`📤 Page ${pageNumber} exported successfully`, 'success');
  } catch (error) {
    showNotification(`❌ Failed to export page ${pageNumber}`, 'error');
    console.error('Export error:', error);
  }
}

async function exportAllData() {
  if (allPagesData.length === 0) {
    showNotification('No data to export', 'warning');
    return;
  }

  const exportBtn = document.getElementById('export-data');
  if (exportBtn) {
    exportBtn.click(); // Trigger existing export functionality
  }
}

// State management functions for multi-page scraping persistence

async function saveScrapingState() {
  const state = {
    isMultiPageScraping,
    currentPageIndex,
    totalPagesToScrape,
    allPagesData: [...allPagesData], // Deep copy to prevent reference issues
    timestamp: Date.now(),
    baseUrl: window.location.origin + window.location.pathname
  };

  console.log(`Saving state: Page ${currentPageIndex}/${totalPagesToScrape}, Data count: ${allPagesData.length}`);

  // Also save data to localStorage as backup
  try {
    const backupKey = `latka_backup_${window.location.href}`;
    localStorage.setItem(backupKey, JSON.stringify(allPagesData));
    localStorage.setItem(`${backupKey}_meta`, JSON.stringify({
      currentPageIndex,
      totalPagesToScrape,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Failed to save backup to localStorage:', error);
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'saveScrapingState',
      state: state
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response.success) {
        resolve();
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

async function getScrapingState() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'getScrapingState'
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response.success) {
        resolve(response.state);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

async function clearScrapingState() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'clearScrapingState'
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response.success) {
        resolve();
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

export async function checkAndResumeMultiPageScraping() {
  try {
    const state = await getScrapingState();

    if (!state || !state.isMultiPageScraping) {
      return; // No ongoing scraping session
    }

    // Check if the state is not too old (prevent resuming very old sessions)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (state.timestamp < fiveMinutesAgo) {
      await clearScrapingState();
      return;
    }

    // Check if we're on the correct base URL
    const currentBaseUrl = window.location.origin + window.location.pathname;
    if (state.baseUrl !== currentBaseUrl) {
      return;
    }

    // Get current page number from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentPageParam = parseInt(urlParams.get('page')) || 1;

    // Verify we're on the expected page
    const expectedPage = state.currentPageIndex + 1;
    if (currentPageParam !== expectedPage) {
      // We might be on a different page than expected, clear state
      await clearScrapingState();
      return;
    }

    // Restore the scraping state
    isMultiPageScraping = state.isMultiPageScraping;
    currentPageIndex = state.currentPageIndex;
    totalPagesToScrape = state.totalPagesToScrape;
    allPagesData = Array.isArray(state.allPagesData) ? [...state.allPagesData] : [];

    // If state is minimal or data is missing, try to restore from localStorage backup
    if (state.isMinimal || allPagesData.length === 0) {
      try {
        const backupKey = `latka_backup_${window.location.href.split('?')[0]}?page=1`;
        const backupData = localStorage.getItem(backupKey);
        if (backupData) {
          const parsedData = JSON.parse(backupData);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            allPagesData = [...parsedData];
            console.log(`Restored ${allPagesData.length} companies from localStorage backup`);
          }
        }
      } catch (error) {
        console.warn('Failed to restore from localStorage backup:', error);
      }
    }

    console.log(`Restored state: Page ${currentPageIndex + 1}/${totalPagesToScrape}, Data count: ${allPagesData.length}`);

    // Update UI to reflect ongoing scraping
    showDataSections();
    updatePageProgress();
    updateScrapingStatus(`Resuming page ${currentPageIndex + 1}/${totalPagesToScrape}`);
    updateStatus(`Resuming multi-page scraping...`, false);

    // Set page count input
    const pageCountInput = document.getElementById('page-count-input');
    if (pageCountInput) {
      pageCountInput.value = totalPagesToScrape;
    }

    // Update button state
    const startBtn = document.getElementById('start-scraping');
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.innerHTML = '<span class="loading-spinner"></span>Scraping...';
    }

    // Continue scraping current page after a brief delay
    setTimeout(() => {
      scrapeCurrentPage();
    }, 1000);

    showNotification(`🔄 Resumed scraping page ${expectedPage} of ${totalPagesToScrape}`, 'info');

  } catch (error) {
    console.error('Error resuming multi-page scraping:', error);
    // Clear any corrupted state
    await clearScrapingState().catch(console.error);
  }
}

// Function to receive data from hidden tabs
export function receivePageData(pageData, pageNumber) {
  try {
    console.log(`Received data from page ${pageNumber}: ${pageData.length} companies`);

    if (pageData.length > 0) {
      // Add data to accumulated data
      allPagesData = [...allPagesData, ...pageData];
      console.log(`Page ${pageNumber}: Added ${pageData.length} companies. Total accumulated: ${allPagesData.length}`);

      // Export data after each page if configured
      if (shouldExportAfterEachPage()) {
        exportPageData(pageData, pageNumber).then(() => {
          console.log(`✅ Page ${pageNumber} exported successfully`);
        }).catch(error => {
          console.error(`❌ Failed to export page ${pageNumber}:`, error);
          showNotification(`❌ Failed to export page ${pageNumber}`, 'error');
        });
      }

      // Update display
      updateDataDisplay();

      showNotification(`✅ Page ${pageNumber} completed: ${pageData.length} companies`, 'success');
    } else {
      // Check if page URL is valid (could indicate non-existent page)
      const baseUrl = window.location.origin + window.location.pathname;
      const pageUrl = `${baseUrl}?page=${pageNumber}`;
      showNotification(`⚠️ Page ${pageNumber} exists but has no data`, 'warning');
    }

    // Update currentPageIndex to match the received page number
    currentPageIndex = pageNumber;

    // Check if we need to scrape more pages or complete
    if (currentPageIndex < totalPagesToScrape) {
      // Continue with next page
      setTimeout(async () => {
        try {
          updateStatus(`Scraping page ${currentPageIndex + 1} of ${totalPagesToScrape}...`, false);
          updateScrapingStatus(`Page ${currentPageIndex + 1}/${totalPagesToScrape}`);
          updatePageProgress();

          await createNextPageTab();
        } catch (error) {
          showNotification(`❌ Failed to create background tab for page ${currentPageIndex + 1}`, 'error');
          completeMultiPageScraping();
        }
      }, 1000);
    } else {
      // All pages completed
      completeMultiPageScraping();
    }

  } catch (error) {
    console.error('Error receiving page data:', error);
    showNotification(`❌ Error processing page ${pageNumber} data`, 'error');
  }
}

// Cancel button functions
function addCancelButton() {
  const actionsGrid = document.getElementById('actions-grid');
  let cancelBtn = document.getElementById('cancel-scraping');

  if (!cancelBtn) {
    cancelBtn = document.createElement('button');
    cancelBtn.id = 'cancel-scraping';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.innerHTML = '<span class="icon">⏹️</span>Cancel';
    cancelBtn.addEventListener('click', cancelMultiPageScraping);
    actionsGrid.appendChild(cancelBtn);
  }

  cancelBtn.style.display = 'block';
}

function removeCancelButton() {
  const cancelBtn = document.getElementById('cancel-scraping');
  if (cancelBtn) {
    cancelBtn.remove();
  }
}

async function cancelMultiPageScraping() {
  try {
    // Clear the state
    await clearScrapingState();

    // Reset variables
    isMultiPageScraping = false;
    currentPageIndex = 0;
    totalPagesToScrape = 1;

    // Update UI
    updateStatus('Scraping cancelled by user', false);
    updateScrapingStatus('Cancelled');

    const startBtn = document.getElementById('start-scraping');
    startBtn.disabled = false;
    startBtn.innerHTML = '<span class="icon">⚡</span>Start Scraping';

    // Remove cancel button
    removeCancelButton();

    // If we have some data, show it
    if (allPagesData.length > 0) {
      scrapedTableData = [...allPagesData]; // Preserve original structure
      hasScrapedData = true;
      updateDataDisplay();
      updateActionButtons(true);
      showNotification(`⏹️ Scraping cancelled. Kept data from ${allPagesData.length} companies across ${currentPageIndex} pages`, 'warning');
    } else {
      showNotification('⏹️ Scraping cancelled', 'info');
    }

  } catch (error) {
    console.error('Error cancelling scraping:', error);
    showNotification('❌ Error cancelling scraping', 'error');
  }
}
