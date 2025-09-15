// Content script for Latka Data Scraper
import { 
  isTargetPage, 
  createSidebar, 
  showSidebar, 
  hideSidebar, 
  updateStatus, 
  startScraping, 
  showDataSections, 
  showNotification, 
  toggleKeepOpen, 
  loadKeepOpenPreference,
  getScrapedTableData,
  setScrapedTableData,
  getHasScrapedData,
  getSidebarVisible,
  getSidebarKeepOpen
} from './sidebar.js';

import { 
  getAppsScriptUrl, 
  setAppsScriptUrl, 
  initializeGoogleSheetsUI, 
  showGoogleSheetsModal 
} from './configuration-modal.js';

import { 
  showAllDataModal, 
  showLoadingModal, 
  showErrorModal 
} from './data-preview-modal.js';

// Expose functions to global scope for cross-module communication
window.getScrapedTableData = getScrapedTableData;
window.setScrapedTableData = setScrapedTableData;
window.getHasScrapedData = getHasScrapedData;
window.getSidebarVisible = getSidebarVisible;
window.getSidebarKeepOpen = getSidebarKeepOpen;
window.showNotification = showNotification;

// Import the multi-page scraping functions
import { checkAndResumeMultiPageScraping, receivePageData } from './sidebar.js';
window.checkAndResumeMultiPageScraping = checkAndResumeMultiPageScraping;
window.receivePageData = receivePageData;

// Initialize sidebar and event listeners
function initializeSidebar() {
  const sidebar = createSidebar();
  
  // Add event listeners
  document.getElementById('close-sidebar').addEventListener('click', hideSidebar);
  document.getElementById('toggle-keep-open').addEventListener('click', toggleKeepOpen);
  document.getElementById('start-scraping').addEventListener('click', startScraping);
  document.getElementById('configure-sheets').addEventListener('click', showGoogleSheetsModal);
  
  // Add event listener for view all data link (using observer pattern since element may not exist yet)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const viewAllLink = document.getElementById('view-all-data');
        if (viewAllLink && !viewAllLink.hasAttribute('data-listener')) {
          viewAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAllDataModal();
          });
          viewAllLink.setAttribute('data-listener', 'true');
        }
      }
    });
  });
  
  observer.observe(sidebar, { childList: true, subtree: true });
  
  return sidebar;
}

// Listen for messages (no popup needed)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkPage') {
    sendResponse({isTargetPage: isTargetPage()});
  } else if (request.action === 'receivePageData') {
    // Handle data from hidden tabs
    if (window.receivePageData) {
      window.receivePageData(request.data, request.pageNumber);
    }
    sendResponse({ success: true });
  } else if (request.action === 'scrapeHiddenTab') {
    // This tab is a background scraping tab
    handleBackgroundTabScraping(request.primaryTabId, request.pageNumber)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
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

// Check if this is a background scraping tab
async function checkIfBackgroundScrapingTab() {
  try {
    // Ask background script to check if this tab is a background tab
    const response = await chrome.runtime.sendMessage({
      action: 'checkIfBackgroundTab'
    });

    if (response && response.success) {
      return response.isBackgroundTab;
    }

    return false;
  } catch (error) {
    console.error('Error checking background tab status:', error);
    return false;
  }
}

// Function to handle background tab scraping
async function handleBackgroundTabScraping(primaryTabId, pageNumber) {
  try {
    console.log(`Background tab scraping page ${pageNumber} for primary tab ${primaryTabId}`);

    // Wait for page to load completely
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scrape the page using a simpler approach
    const pageData = scrapeLatkaTableDirect();

    console.log(`Scraped ${pageData.length} companies from background tab`);

    // Always send data back to primary tab, even if empty
    // This allows the primary tab to handle non-existent pages properly
    await chrome.runtime.sendMessage({
      action: 'sendDataToPrimaryTab',
      data: pageData,
      primaryTabId: primaryTabId,
      pageNumber: pageNumber,
      hasData: pageData.length > 0
    });

    // Close this background tab after sending data
    // Give a bit more time if auto-export is happening
    setTimeout(async () => {
      await chrome.runtime.sendMessage({
        action: 'closeHiddenTab'
      });
    }, 2000); // Increased delay to allow for export

  } catch (error) {
    console.error('Error in background tab scraping:', error);
    throw error;
  }
}

// Direct scraping function for background tabs (duplicate of sidebar logic)
function scrapeLatkaTableDirect() {
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

// Auto-activate on target page
if (isTargetPage()) {
  // Check if this tab is part of multi-page scraping (should not show sidebar)
  checkIfBackgroundScrapingTab().then(isBackgroundTab => {
    if (!isBackgroundTab) {
      // Set extension badge to indicate it's active
      chrome.runtime.sendMessage({action: 'updateBadge', text: '●'});

      // Auto-show sidebar immediately
      setTimeout(() => {
        initializeSidebar();
        showSidebar();
        loadKeepOpenPreference();

        // Check if we're resuming a multi-page scraping session
        checkAndResumeMultiPageScraping();
      }, 500);
    } else {
      console.log('Background scraping tab - not showing sidebar, ready for scraping');

      // Signal that this background tab is ready
      window.backgroundTabReady = true;
    }
  });
}