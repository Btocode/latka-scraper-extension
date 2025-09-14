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

// Auto-activate on target page
if (isTargetPage()) {
  // Set extension badge to indicate it's active
  chrome.runtime.sendMessage({action: 'updateBadge', text: '●'});
  
  // Auto-show sidebar immediately
  setTimeout(() => {
    initializeSidebar();
    showSidebar();
    loadKeepOpenPreference();
  }, 500);
}