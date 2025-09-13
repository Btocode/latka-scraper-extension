// Background script for Latka Data Scraper
chrome.runtime.onInstalled.addListener(() => {
  console.log('Latka Data Scraper extension installed');
});

// Import hot reload in development
if (chrome.runtime.getManifest && !chrome.runtime.getManifest().key) {
  try {
    importScripts('hot-reload.js');
  } catch (error) {
    console.warn('Hot reload script not found:', error);
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadge') {
    chrome.action.setBadgeText({
      text: request.text,
      tabId: sender.tab.id
    });
    
    if (request.text === '●') {
      chrome.action.setBadgeBackgroundColor({
        color: '#51cf66',
        tabId: sender.tab.id
      });
    } else if (request.text === 'ON') {
      chrome.action.setBadgeBackgroundColor({
        color: '#ff6b6b',
        tabId: sender.tab.id
      });
    }
  }
});

// Clear badge when tab is updated (navigating away from target page)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (!tab.url.includes('getlatka.com/saas-companies')) {
      chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
  }
});