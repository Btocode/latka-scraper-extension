// Content script for Latka Data Scraper
let sidebarVisible = false;
let sidebarElement = null;
let sidebarKeepOpen = false;

function isTargetPage() {
  return window.location.href.includes('getlatka.com/saas-companies');
}

function createSidebar() {
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

  // Add event listeners
  document.getElementById('close-sidebar').addEventListener('click', hideSidebar);
  document.getElementById('toggle-keep-open').addEventListener('click', toggleKeepOpen);
  document.getElementById('start-scraping').addEventListener('click', startScraping);

  return sidebar;
}

function showSidebar() {
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

function hideSidebar() {
  if (sidebarElement) {
    sidebarElement.classList.add('hidden');
    document.body.style.paddingRight = '0';
    sidebarVisible = false;
    
    // Update extension badge
    chrome.runtime.sendMessage({action: 'updateBadge', text: ''});
  }
}

function updateStatus(message, isActive = true) {
  const statusText = document.querySelector('.status-text');
  const statusDot = document.querySelector('.status-dot');
  
  if (statusText) statusText.textContent = message;
  if (statusDot) {
    statusDot.classList.toggle('active', isActive);
    statusDot.classList.toggle('loading', !isActive);
  }
}

// Global variable to store scraped data
let scrapedTableData = [];
let hasScrapedData = false;

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
  const table = document.querySelector('table.data-table_table__SwBLY');
  if (!table) {
    console.warn('Latka table not found');
    return [];
  }
  
  const rows = table.querySelectorAll('tr');
  const scrapedData = [];
  let interviewColumnIndex = -1;
  
  // First, find the Interview column index
  if (rows.length > 0) {
    const headerCells = rows[0].querySelectorAll('th, td');
    headerCells.forEach((cell, index) => {
      const cellText = cell.textContent.trim().toLowerCase();
      if (cellText.includes('interview')) {
        interviewColumnIndex = index;
      }
    });
  }
  
  rows.forEach((row, rowIndex) => {
    const cells = row.querySelectorAll('th, td');
    const rowData = [];
    
    cells.forEach((cell, cellIndex) => {
      // Skip the Interview column
      if (cellIndex === interviewColumnIndex) {
        return;
      }
      
      const cellData = extractCellData(cell);
      rowData.push(cellData);
    });
    
    if (rowData.length > 0) {
      scrapedData.push(rowData);
    }
  });
  
  return scrapedData;
}

function startScraping() {
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
          const nameCell = row[1]; // Name column
          const revenueCell = row[2]; // Revenue column
          const teamSizeCell = row[11]; // Team Size column
          
          return {
            name: nameCell?.text || 'N/A',
            revenue: revenueCell?.text || 'N/A',
            teamSize: teamSizeCell?.text || 'N/A'
          };
        });
        
        displayScrapedData(previewData);
        updateStatus('Scraping completed', true);
        showDataSections();
        updateActionButtons(true);
        
        document.getElementById('companies-count').textContent = scrapedTableData.length - 1; // Subtract header row
        hasScrapedData = true;
      } else {
        updateStatus('No data found', false);
        displayScrapedData([]);
        hasScrapedData = false;
      }
    } catch (error) {
      console.error('Scraping error:', error);
      updateStatus('Scraping failed', false);
      displayScrapedData([]);
      hasScrapedData = false;
    }
    
    startBtn.disabled = false;
    
  }, 1000);
}

function showDataSections() {
  // Show data preview and statistics sections
  document.getElementById('data-section').style.display = 'block';
  document.getElementById('stats-section').style.display = 'block';
  
  // Add event listener for view all link
  const viewAllLink = document.getElementById('view-all-data');
  if (viewAllLink && !viewAllLink.hasAttribute('data-listener')) {
    viewAllLink.addEventListener('click', (e) => {
      e.preventDefault();
      showAllDataModal();
    });
    viewAllLink.setAttribute('data-listener', 'true');
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

function exportData() {
  if (scrapedTableData.length === 0) {
    console.warn('No data to export. Please scrape data first.');
    return;
  }
  
  // Create a detailed summary for console
  const summary = {
    timestamp: new Date().toISOString(),
    totalRows: scrapedTableData.length,
    totalCompanies: scrapedTableData.length - 1, // Exclude header
    columns: scrapedTableData[0]?.map(cell => cell.text) || [],
    source: 'getlatka.com/saas-companies'
  };
  
  console.group('🚀 Latka Scraper - Export Results');
  console.log('📊 Summary:', summary);
  console.log('📋 Complete Data Structure:');
  console.log(JSON.stringify(scrapedTableData, null, 2));
  console.groupEnd();
  
  // Also log the raw array for easy copy-paste
  console.log('🔍 Raw Data Array:', scrapedTableData);
  
  // Create downloadable JSON (optional enhancement)
  const dataStr = JSON.stringify(scrapedTableData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  // Show success message with more details
  const exportBtn = document.getElementById('export-data');
  const originalHTML = exportBtn.innerHTML;
  exportBtn.innerHTML = '<span class="icon success-icon">✓</span>Exported!';
  exportBtn.classList.add('success');
  
  // Update stats
  const companiesCount = document.getElementById('companies-count');
  if (companiesCount) {
    companiesCount.textContent = scrapedTableData.length - 1;
  }
  
  setTimeout(() => {
    exportBtn.innerHTML = originalHTML;
    exportBtn.classList.remove('success');
  }, 3000);
  
  // Show a temporary notification
  showNotification(`Exported ${scrapedTableData.length - 1} companies to console`, 'success');
}

function showAllDataModal() {
  if (scrapedTableData.length === 0) return;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'latka-modal';
  modal.id = 'data-modal';
  
  // Get column headers from first row
  const headers = scrapedTableData[0] || [];
  const dataRows = scrapedTableData.slice(1); // Skip header row
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>All Scraped Data (${dataRows.length} companies)</h3>
        <button class="modal-close" id="close-modal">×</button>
      </div>
      <div class="modal-body">
        <div class="modal-table-container">
          <table class="modal-table">
            <thead>
              <tr>
                ${headers.map(header => `<th>${header.text}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${dataRows.map(row => `
                <tr>
                  ${row.map(cell => {
                    if (Object.keys(cell.links).length > 0) {
                      // If cell has links, create clickable links
                      const links = Object.entries(cell.links).map(([type, url]) => 
                        `<a href="${url}" target="_blank" title="${type}">${cell.text}</a>`
                      ).join(' ');
                      return `<td>${links}</td>`;
                    } else {
                      return `<td>${cell.text}</td>`;
                    }
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  const closeBtn = document.getElementById('close-modal');
  closeBtn.addEventListener('click', closeModal);
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Close on escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

function closeModal() {
  const modal = document.getElementById('data-modal');
  if (modal) {
    modal.remove();
  }
}

function showNotification(message, type = 'info') {
  // Create a temporary notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#28a745' : '#333'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
}

// Listen for messages (no popup needed)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkPage') {
    sendResponse({isTargetPage: isTargetPage()});
  }
});

// Add hot reload support
if (chrome.runtime && chrome.runtime.onConnect) {
  chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === 'devtools') {
      port.onMessage.addListener(function(message) {
        if (message === 'reload') {
          location.reload();
        }
      });
    }
  });
}

function toggleKeepOpen() {
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
function loadKeepOpenPreference() {
  const saved = localStorage.getItem('latka-sidebar-keep-open');
  sidebarKeepOpen = saved === 'true';
  
  if (sidebarKeepOpen && document.getElementById('toggle-keep-open')) {
    const toggleBtn = document.getElementById('toggle-keep-open');
    toggleBtn.textContent = 'Auto Close';
    toggleBtn.style.background = '#28a745';
  }
}

// Auto-activate on target page
if (isTargetPage()) {
  // Set extension badge to indicate it's active
  chrome.runtime.sendMessage({action: 'updateBadge', text: '●'});
  
  // Auto-show sidebar immediately
  setTimeout(() => {
    showSidebar();
    loadKeepOpenPreference();
  }, 500);
}