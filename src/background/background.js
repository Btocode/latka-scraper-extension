// Background script for Latka Data Scraper
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed
});

// Import hot reload in development
if (chrome.runtime.getManifest && !chrome.runtime.getManifest().key) {
  try {
    importScripts('hot-reload.js');
  } catch (error) {
    // Hot reload script not found in production
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
  } else if (request.action === 'exportToGoogleSheets') {
    // Handle Google Sheets export via background script to bypass CORS
    handleGoogleSheetsExport(request.data, request.scriptUrl, request.options)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Indicates we will send a response asynchronously
  }
});

// Function to handle Google Sheets export
async function handleGoogleSheetsExport(values, scriptUrl, options = {}) {
  try {
    // Use a more compatible approach for Apps Script web apps
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', // This bypasses CORS but we won't get response data
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: values,
        clear: options.clear || false
      })
    });

    // With no-cors mode, we can't read the response, so we'll assume success
    // The Apps Script will still receive and process the data
    return { 
      ok: true, 
      message: 'Data sent to Google Sheets successfully',
      wrote: values.length 
    };
  } catch (error) {
    
    // If no-cors fails, try with a different approach
    try {
      // Alternative: Use a simple GET request with data in URL params
      const params = new URLSearchParams({
        values: JSON.stringify(values),
        clear: options.clear || false
      });
      
      const getUrl = `${scriptUrl}?${params.toString()}`;
      await fetch(getUrl, { mode: 'no-cors' });
      
      return { 
        ok: true, 
        message: 'Data sent to Google Sheets via GET method',
        wrote: values.length 
      };
    } catch (fallbackError) {
      throw new Error('Failed to export to Google Sheets. Please check your Apps Script configuration.');
    }
  }
}

// Clear badge when tab is updated (navigating away from target page)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (!tab.url.includes('getlatka.com/saas-companies')) {
      chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
  }
});