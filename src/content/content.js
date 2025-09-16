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
  initializeGoogleSheetsUI
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
  
  // Add event listeners with error handling
  const addSafeEventListener = (elementId, handler) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener('click', handler);
    }
  };
  
  addSafeEventListener('close-sidebar', hideSidebar);
  addSafeEventListener('toggle-keep-open', toggleKeepOpen);
  addSafeEventListener('start-scraping', startScraping);
  
  addSafeEventListener('configure-sheets', () => {
    window.toggleSheetsConfig?.();
  });
  
  addSafeEventListener('test-sheets-connection', () => {
    window.testSheetsConnection?.();
  });
  
  addSafeEventListener('save-sheets-config', () => {
    window.saveSheetsConfig?.();
  });
  
  addSafeEventListener('disable-sheets', () => {
    window.disableSheetsConnection?.();
  });
  
  // URL input change handler
  const urlInput = document.getElementById('sheets-url-input');
  if (urlInput) {
    urlInput.addEventListener('input', () => {
      const saveBtn = document.getElementById('save-sheets-config');
      if (saveBtn) saveBtn.disabled = true;
    });
  }
  
  // View all data link observer
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

// Hot reload support removed for production builds

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
    if (error.message.includes('Extension context invalidated')) {
      console.warn('Extension context invalidated - assuming not a background tab');
      return false;
    }
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
    try {
      await chrome.runtime.sendMessage({
        action: 'sendDataToPrimaryTab',
        data: pageData,
        primaryTabId: primaryTabId,
        pageNumber: pageNumber,
        hasData: pageData.length > 0
      });
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated - cannot send data to primary tab');
      } else {
        throw error;
      }
    }

    // Close this background tab after sending data
    // Give a bit more time if auto-export is happening
    setTimeout(async () => {
      try {
        await chrome.runtime.sendMessage({
          action: 'closeHiddenTab'
        });
      } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
          console.warn('Extension context invalidated - cannot close hidden tab');
        } else {
          console.error('Error closing hidden tab:', error);
        }
      }
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
    'Website', // Company website URL
    'LinkedIn', // Company LinkedIn URL
    'Funding',
    'Valuation',
    'Growth',
    'Founder',
    'Founder LinkedIn', // Founder LinkedIn profile only
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
          if (reqCol === 'Name' || reqCol === 'Website' || reqCol === 'LinkedIn') {
              cellIndex = headers.indexOf('Name');
          } else if (reqCol === 'Founder' || reqCol === 'Founder LinkedIn') {
               cellIndex = headers.indexOf('Founder');
          } else {
               cellIndex = headers.indexOf(reqCol);
          }

          if (cellIndex > -1 && cellIndex < cells.length) {
               cell = cells[cellIndex];

               if (reqCol === 'Website') {
                  // Look for website URL in anchor tags with aria-label="website url"
                  const websiteLinks = [];
                  const websiteLink = cell.querySelector('a[aria-label="website url"]');
                  if (websiteLink && websiteLink.href) {
                    websiteLinks.push(websiteLink.href);
                  }
                  rowData[reqCol] = websiteLinks.join(',');
                  
               } else if (reqCol === 'LinkedIn') {
                  // Look for Company LinkedIn with aria-label="Company linkedIn"
                  const linkedinLinks = [];
                  const linkedinLink = cell.querySelector('a[aria-label="Company linkedIn"]');
                  if (linkedinLink && linkedinLink.href) {
                    linkedinLinks.push(linkedinLink.href);
                  }
                  rowData[reqCol] = linkedinLinks.join(',');

               } else if (reqCol === 'Founder LinkedIn') {
                   // Collect LinkedIn links from both <a> elements and <button> onclick handlers
                  const linkedinLinks = [];
                  
                  // Check for <a> elements with LinkedIn URLs
                  const links = Array.from(cell.querySelectorAll('a'));
                  links.forEach(link => {
                    if (link.href && link.href.includes('linkedin.com')) {
                      linkedinLinks.push(link.href);
                    }
                  });
                  
                  // Check for <button> elements with LinkedIn URLs in onclick handlers
                  const buttons = Array.from(cell.querySelectorAll('button[onclick]'));
                  buttons.forEach(button => {
                    const onclick = button.getAttribute('onclick');
                    if (onclick) {
                      // Extract LinkedIn URL from onclick handler like: window.open('https://www.linkedin.com/in/...')
                      const linkedinMatch = onclick.match(/linkedin\.com\/[^'"\)]+/gi);
                      if (linkedinMatch) {
                        linkedinMatch.forEach(match => {
                          const fullUrl = match.startsWith('http') ? match : 'https://www.' + match;
                          linkedinLinks.push(fullUrl);
                        });
                      }
                    }
                  });
                  
                  // Remove duplicates and join
                  const uniqueLinkedinLinks = [...new Set(linkedinLinks)];
                  rowData[reqCol] = uniqueLinkedinLinks.join(',');

               } else {
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