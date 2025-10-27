document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadStats();
    loadCustomUrls();
    
    // Refresh stats periodically while popup is open
    setInterval(loadStats, 1000);
    
    document.getElementById('main-toggle').addEventListener('change', toggleBlocking);
    document.getElementById('reset-live-counter').addEventListener('click', resetLiveCounter);
    
    document.getElementById('block-youtube-ads').addEventListener('change', saveSettings);
    document.getElementById('block-popups').addEventListener('change', saveSettings);
    document.getElementById('block-trackers').addEventListener('change', saveSettings);
    
    document.getElementById('add-url').addEventListener('click', addCustomUrl);
    document.getElementById('custom-url').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') addCustomUrl();
    });
  });
  
  function loadSettings() {
    chrome.storage.sync.get({
      blockYouTubeAds: true,
      blockPopups: true,
      blockTrackers: true,
      isEnabled: true
    }, function(items) {
      document.getElementById('block-youtube-ads').checked = items.blockYouTubeAds;
      document.getElementById('block-popups').checked = items.blockPopups;
      document.getElementById('block-trackers').checked = items.blockTrackers;
      document.getElementById('main-toggle').checked = items.isEnabled;
      updateToggleDisplay(items.isEnabled);
    });
  }
  
  function loadStats() {
    // Get ads count from in-memory counter (no storage read needed)
    chrome.runtime.sendMessage({action: 'getAdsCount'}, function(response) {
      if (response && response.count !== undefined) {
        document.getElementById('ads-blocked').textContent = response.count.toLocaleString();
      } else {
        // Fallback to session storage if message fails
        chrome.storage.session.get({adsBlockedLive: 0}, function(items) {
          document.getElementById('ads-blocked').textContent = items.adsBlockedLive.toLocaleString();
        });
      }
    });
    
    // Count live tabs using activeTab permission
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      if (chrome.runtime.lastError) {
        document.getElementById('sites-protected').textContent = '0';
      } else {
        document.getElementById('sites-protected').textContent = tabs.length;
      }
    });
  }
  
  function loadCustomUrls() {
    chrome.storage.sync.get({whitelistUrls: []}, function(items) {
      const urlList = document.getElementById('url-list');
      urlList.innerHTML = '';
      
      if (items.whitelistUrls.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'custom-url-item';
        emptyMsg.style.cssText = 'color: #999; font-style: italic; background: white;';
        emptyMsg.textContent = 'No URLs in whitelist';
        urlList.appendChild(emptyMsg);
        return;
      }
      
      items.whitelistUrls.forEach(function(url, index) {
        const urlItem = document.createElement('div');
        urlItem.className = 'custom-url-item';
        
        const span = document.createElement('span');
        span.title = url;
        span.textContent = truncateUrl(url);
        urlItem.appendChild(span);
        
        const button = document.createElement('button');
        button.textContent = 'Remove';
        button.addEventListener('click', function() {
          removeCustomUrlByIndex(index);
        });
        urlItem.appendChild(button);
        
        urlList.appendChild(urlItem);
      });
    });
  }
  
  function truncateUrl(url, maxLength = 30) {
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  }
  
  function saveSettings() {
    const settings = {
      blockYouTubeAds: document.getElementById('block-youtube-ads').checked,
      blockPopups: document.getElementById('block-popups').checked,
      blockTrackers: document.getElementById('block-trackers').checked
    };
    chrome.storage.sync.set(settings);
  }
  
  function toggleBlocking(e) {
    const isEnabled = e.target.checked;
    chrome.storage.sync.set({isEnabled: isEnabled}, function() {
      updateToggleDisplay(isEnabled);
      
      // Notify current tab to reload blocking
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && !chrome.runtime.lastError) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleBlocking', enabled: isEnabled}, function() {
            if (chrome.runtime.lastError) {
              // Tab might not have content script loaded yet
            }
          });
        }
      });
    });
  }
  
  function updateToggleDisplay(isEnabled) {
    const status = document.getElementById('toggle-status');
    status.textContent = isEnabled ? 'ON' : 'OFF';
    status.style.color = isEnabled ? '#667eea' : '#999';
  }
  
  function isValidUrl(hostname) {
    // Validate hostname: only allow alphanumeric, dots, dashes
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return hostnameRegex.test(hostname) && hostname.length <= 253;
  }
  
  function addCustomUrl() {
    const input = document.getElementById('custom-url');
    const url = input.value.trim();
    
    if (url === '') {
      alert('Please enter a URL');
      return;
    }
    
    // Validate URL format
    if (!isValidUrl(url)) {
      alert('Please enter a valid hostname (e.g., youtube.com)');
      return;
    }
    
    chrome.storage.sync.get({whitelistUrls: []}, function(items) {
      const urls = items.whitelistUrls;
      
      if (urls.includes(url)) {
        alert('URL already in whitelist');
        return;
      }
      
      urls.push(url);
      chrome.storage.sync.set({whitelistUrls: urls}, function() {
        input.value = '';
        loadCustomUrls();
      });
    });
  }
  
  function removeCustomUrlByIndex(index) {
    chrome.storage.sync.get({whitelistUrls: []}, function(items) {
      const urls = items.whitelistUrls;
      urls.splice(index, 1);
      chrome.storage.sync.set({whitelistUrls: urls}, function() {
        loadCustomUrls();
      });
    });
  }
  
  function resetLiveCounter() {
    chrome.runtime.sendMessage({action: 'resetLiveCounter'}, function() {
      loadStats(); // Refresh the display
    });
  }
  