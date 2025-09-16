// Background script for Latka Data Scraper
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed
});

// Hot reload functionality removed for production builds

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
  } else if (request.action === 'saveScrapingState') {
    // Save multi-page scraping state
    saveScrapingState(request.state, sender.tab.id)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  } else if (request.action === 'getScrapingState') {
    // Get multi-page scraping state
    getScrapingState(sender.tab.id)
      .then(state => sendResponse({ success: true, state }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  } else if (request.action === 'clearScrapingState') {
    // Clear multi-page scraping state
    clearScrapingState(sender.tab.id)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  } else if (request.action === 'createHiddenScrapingTab') {
    // Create background tab for scraping
    createBackgroundScrapingTab(request.url, sender.tab.id)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  } else if (request.action === 'sendDataToPrimaryTab') {
    // Send scraped data from hidden tab to primary tab
    sendDataToPrimaryTab(request.data, request.primaryTabId, request.pageNumber)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  } else if (request.action === 'closeHiddenTab') {
    // Close background scraping tab
    chrome.tabs.remove(sender.tab.id)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  } else if (request.action === 'cleanupScrapingGroup') {
    // Clean up scraping group
    cleanupScrapingGroup(request.primaryTabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  } else if (request.action === 'checkMultiPageScraping') {
    // Check if multi-page scraping is active for this tab
    chrome.storage.local.get(`multiPageScraping_${sender.tab.id}`)
      .then(result => {
        const isActive = result[`multiPageScraping_${sender.tab.id}`]?.active || false;
        sendResponse({ success: true, isActive });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  } else if (request.action === 'checkIfBackgroundTab') {
    // Check if the sender tab is a background scraping tab
    chrome.storage.local.get(`backgroundTab_${sender.tab.id}`)
      .then(result => {
        const isBackgroundTab = !!result[`backgroundTab_${sender.tab.id}`];
        sendResponse({ success: true, isBackgroundTab });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  } else if (request.action === 'getCurrentTabId') {
    // Return the sender tab ID
    sendResponse({ success: true, tabId: sender.tab.id });
    return true;
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

// State management functions for multi-page scraping
async function saveScrapingState(state, tabId) {
  try {
    const key = `scrapingState_${tabId}`;

    // Log data size for debugging
    const dataSize = JSON.stringify(state).length;
    console.log(`Saving scraping state for tab ${tabId}:`, {
      currentPage: state.currentPageIndex,
      totalPages: state.totalPagesToScrape,
      dataCount: state.allPagesData?.length || 0,
      dataSize: `${(dataSize / 1024).toFixed(2)}KB`
    });

    await chrome.storage.local.set({ [key]: state });
    console.log('Scraping state saved successfully');
  } catch (error) {
    console.error('Error saving scraping state:', error);

    // If storage quota exceeded, try to save essential state only
    if (error.message?.includes('QUOTA_BYTES')) {
      console.warn('Storage quota exceeded, saving minimal state');
      const minimalState = {
        isMultiPageScraping: state.isMultiPageScraping,
        currentPageIndex: state.currentPageIndex,
        totalPagesToScrape: state.totalPagesToScrape,
        allPagesData: [], // Don't save data in minimal state
        timestamp: state.timestamp,
        baseUrl: state.baseUrl,
        isMinimal: true
      };
      await chrome.storage.local.set({ [key]: minimalState });
    } else {
      throw error;
    }
  }
}

async function getScrapingState(tabId) {
  try {
    const key = `scrapingState_${tabId}`;
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  } catch (error) {
    console.error('Error getting scraping state:', error);
    throw error;
  }
}

async function clearScrapingState(tabId) {
  try {
    const key = `scrapingState_${tabId}`;
    await chrome.storage.local.remove(key);
    console.log('Scraping state cleared for tab:', tabId);
  } catch (error) {
    console.error('Error clearing scraping state:', error);
    throw error;
  }
}

// Clear badge when tab is updated (navigating away from target page)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (!tab.url.includes('getlatka.com/saas-companies')) {
      chrome.action.setBadgeText({ text: '', tabId: tabId });
      // Clear scraping state when leaving target pages
      clearScrapingState(tabId).catch(console.error);
    }
  }
});

// Background tab management functions
async function createBackgroundScrapingTab(url, primaryTabId) {
  try {
    console.log('Creating background tab with URL:', url);

    // Create visible but unfocused tab
    const tab = await chrome.tabs.create({
      url: url,
      active: false, // Keep unfocused (not active)
      pinned: false
    });

    console.log('Background tab created successfully:', tab.id);

    // Get or create tab group for scraping (pass tab.id for first tab)
    const groupId = await getOrCreateScrapingGroup(primaryTabId, tab.id);

    // If group already existed, add this tab to it
    if (groupId !== -1) {
      const existingGroupKey = `scrapingGroup_${primaryTabId}`;
      const existingGroup = await chrome.storage.local.get(existingGroupKey);

      // Only add to group if it was already created (not the first tab)
      if (existingGroup[existingGroupKey] && existingGroup[existingGroupKey].created < Date.now() - 1000) {
        await chrome.tabs.group({
          tabIds: [tab.id],
          groupId: groupId
        });
      }
    }

    // Store association between background tab and primary tab
    await chrome.storage.local.set({
      [`backgroundTab_${tab.id}`]: {
        primaryTabId: primaryTabId,
        url: url,
        created: Date.now(),
        groupId: groupId
      }
    });

    // Set flag to indicate multi-page scraping is active
    await chrome.storage.local.set({
      [`multiPageScraping_${primaryTabId}`]: {
        active: true,
        groupId: groupId,
        startTime: Date.now()
      }
    });

    // Wait for tab to load and send scraping instruction with retry logic
    setTimeout(async () => {
      const pageNumber = new URL(url).searchParams.get('page') || '1';
      await sendScrapingInstruction(tab.id, primaryTabId, parseInt(pageNumber));
    }, 5000); // Wait 5 seconds for page to load

    return { tabId: tab.id, groupId: groupId };
  } catch (error) {
    console.error('Error creating background tab:', error);
    throw error;
  }
}

async function sendDataToPrimaryTab(data, primaryTabId, pageNumber) {
  try {
    // Send data to the primary tab
    await chrome.tabs.sendMessage(primaryTabId, {
      action: 'receivePageData',
      data: data,
      pageNumber: pageNumber
    });
  } catch (error) {
    console.error('Error sending data to primary tab:', error);
    throw error;
  }
}

// Get or create a tab group for scraping
async function getOrCreateScrapingGroup(primaryTabId, firstTabId) {
  try {
    // Check if group already exists for this primary tab
    const existingGroupKey = `scrapingGroup_${primaryTabId}`;
    const existingGroup = await chrome.storage.local.get(existingGroupKey);

    if (existingGroup[existingGroupKey]) {
      return existingGroup[existingGroupKey].groupId;
    }

    // Check if tab grouping is supported
    if (!chrome.tabs.group) {
      console.warn('Tab grouping not supported, skipping group creation');
      return -1;
    }

    // Create new group with the first tab
    const group = await chrome.tabs.group({
      tabIds: [firstTabId] // Use the first background tab to create the group
    });

    // Update group properties (with error handling)
    try {
      if (chrome.tabGroups && chrome.tabGroups.update) {
        await chrome.tabGroups.update(group, {
          title: '🔄 Latka Scraping',
          color: 'orange',
          collapsed: true // Keep collapsed to reduce visibility
        });
      }
    } catch (groupUpdateError) {
      console.warn('Failed to update tab group properties:', groupUpdateError);
      // Continue without updating group properties
    }

    // Store group info
    await chrome.storage.local.set({
      [existingGroupKey]: {
        groupId: group,
        primaryTabId: primaryTabId,
        created: Date.now()
      }
    });

    console.log('Created scraping group:', group);
    return group;
  } catch (error) {
    console.error('Error creating/getting scraping group:', error);
    return -1; // Return -1 if grouping fails
  }
}

// Clean up scraping group when all scraping is complete
async function cleanupScrapingGroup(primaryTabId) {
  try {
    const groupKey = `scrapingGroup_${primaryTabId}`;
    const groupData = await chrome.storage.local.get(groupKey);

    if (groupData[groupKey]) {
      const groupId = groupData[groupKey].groupId;

      // Get all tabs in the group
      const tabs = await chrome.tabs.query({ groupId: groupId });

      // Close all tabs in the group
      if (tabs.length > 0) {
        const tabIds = tabs.map(tab => tab.id);
        await chrome.tabs.remove(tabIds);
      }

      // Clean up storage
      await chrome.storage.local.remove(groupKey);
      await chrome.storage.local.remove(`multiPageScraping_${primaryTabId}`);

      console.log(`Cleaned up scraping group ${groupId} for primary tab ${primaryTabId}`);
    }
  } catch (error) {
    console.error('Error cleaning up scraping group:', error);
  }
}

// Function to send scraping instruction with retry logic
async function sendScrapingInstruction(tabId, primaryTabId, pageNumber, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'scrapeHiddenTab',
        primaryTabId: primaryTabId,
        pageNumber: pageNumber
      });
      console.log(`Successfully sent scraping instruction to tab ${tabId} on attempt ${i + 1}`);
      return; // Success, exit function
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed to send scraping instruction to tab ${tabId}:`, error.message);

      // If not the last attempt, wait before retrying
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }
  }

  console.error(`Failed to send scraping instruction to tab ${tabId} after ${retries} attempts`);
}

// Clear state when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  clearScrapingState(tabId).catch(console.error);

  // Clean up background tab associations
  chrome.storage.local.remove(`backgroundTab_${tabId}`).catch(console.error);
});