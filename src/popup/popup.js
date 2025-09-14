// Popup script for Latka Scraper Extension

document.addEventListener('DOMContentLoaded', function() {
  const openLatkaBtn = document.getElementById('open-latka');
  const viewDataBtn = document.getElementById('view-data');
  const statusText = document.getElementById('status-text');
  const statusDetails = document.getElementById('status-details');

  // Open Latka website
  openLatkaBtn.addEventListener('click', function() {
    chrome.tabs.create({
      url: 'https://getlatka.com/saas-companies'
    });
    window.close();
  });

  // Check if we're on the target page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    if (currentTab.url.includes('getlatka.com/saas-companies')) {
      statusText.textContent = 'Active';
      statusDetails.textContent = 'Ready to scrape data from this page';
      
      // Check if there's scraped data
      chrome.tabs.sendMessage(currentTab.id, {action: 'getScrapedData'}, function(response) {
        if (response && response.hasData) {
          viewDataBtn.style.display = 'block';
          viewDataBtn.addEventListener('click', function() {
            chrome.tabs.sendMessage(currentTab.id, {action: 'showSidebar'});
            window.close();
          });
        }
      });
    } else {
      statusText.textContent = 'Inactive';
      statusDetails.textContent = 'Navigate to getlatka.com/saas-companies to start scraping';
    }
  });

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStatus') {
      statusText.textContent = request.status;
      statusDetails.textContent = request.details;
      
      if (request.hasData) {
        viewDataBtn.style.display = 'block';
      }
    }
  });
});
