// In-memory counter tracking per-tab
const tabAdCounts = new Map(); // tabId -> count
let totalAdsBlocked = 0;

// Throttled save to storage.session (every 2 seconds)
let saveTimeout = null;
function saveToSessionStorage() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    chrome.storage.session.set({adsBlockedLive: totalAdsBlocked});
  }, 2000);
}

chrome.runtime.onInstalled.addListener((details) => {
    // Only set defaults on first install, not on reload
    if (details.reason === 'install') {
      chrome.storage.sync.set({
        blockYouTubeAds: true,
        blockPopups: true,
        blockTrackers: true,
        isEnabled: true,
        whitelistUrls: []
      });
    }
  });
  
  // Load session data on startup
  chrome.storage.session.get({adsBlockedLive: 0}, function(items) {
    totalAdsBlocked = items.adsBlockedLive || 0;
  });
  
  // Reset counter when browser starts
  chrome.runtime.onStartup.addListener(() => {
    tabAdCounts.clear();
    totalAdsBlocked = 0;
    chrome.storage.session.set({adsBlockedLive: 0});
  });
  
  // Track tab removal (subtract their count from total)
  chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    const tabCount = tabAdCounts.get(tabId) || 0;
    if (tabCount > 0) {
      totalAdsBlocked = Math.max(0, totalAdsBlocked - tabCount);
      tabAdCounts.delete(tabId);
      saveToSessionStorage();
    }
  });
  
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleBlocking') {
      chrome.storage.sync.set({isEnabled: request.enabled});
      sendResponse({status: 'success'});
    }
    
    if (request.action === 'incrementBlocked') {
      // Get the tab ID from the sender
      const tabId = sender.tab ? sender.tab.id : null;
      
      if (tabId) {
        // Update per-tab counter
        const currentTabCount = tabAdCounts.get(tabId) || 0;
        let newTabCount = currentTabCount + 1;
        
        // Cap at 62 and reset for this tab
        if (newTabCount >= 62) {
          newTabCount = 0;
        }
        tabAdCounts.set(tabId, newTabCount);
        
        // Update total (in memory, no storage write yet)
        totalAdsBlocked++;
        
        // Throttled save to session storage
        saveToSessionStorage();
      }
      
      sendResponse({status: 'incremented'});
    }
    
    if (request.action === 'resetLiveCounter') {
      // Reset in-memory counters
      tabAdCounts.clear();
      totalAdsBlocked = 0;
      chrome.storage.session.set({adsBlockedLive: 0});
      sendResponse({status: 'reset'});
    }
    
    if (request.action === 'getAdsCount') {
      // Return current total from memory
      sendResponse({count: totalAdsBlocked});
      return true; // Async response
    }
    
    return true; // Keep message channel open for async response
  });