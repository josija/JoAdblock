(function() {
    'use strict';
    
    // Track which ads have already been blocked to avoid double counting
    const blockedAdIds = new Set();
    
    // Track whitelisted domains
    let whitelistedDomains = [];
    
    // Load whitelist on startup
    chrome.storage.sync.get({whitelistUrls: []}, function(items) {
      whitelistedDomains = items.whitelistUrls || [];
    });
    
    // Listen for whitelist changes
    chrome.storage.onChanged.addListener(function(changes, areaName) {
      if (areaName === 'sync' && changes.whitelistUrls) {
        whitelistedDomains = changes.whitelistUrls.newValue || [];
      }
    });
    
    // Comprehensive ad blocking for YouTube
    function blockYouTubeAdsAggressively() {
      if (!blockingActive) return;
      
      // Check if current site is whitelisted
      const hostname = window.location.hostname;
      if (whitelistedDomains.some(url => hostname.includes(url))) return;
      
      let adsBlockedThisRun = 0;
      
      // Safety check: Only run if we're actually on YouTube and page is loaded
      if (!window.location.hostname.includes('youtube.com') || !document.body) {
        return;
      }
      
      // Method 1: Remove specific YouTube ad elements
      const youtubeAdSelectors = [
        '.video-ads',
        '.ytp-ad-module',
        '.ad-div',
        '#player-ads',
        '.ytp-ad-overlay-container',
        '.ytp-ad-player-overlay',
        '.ytp-ad-message-overlay',
        '.ytp-ad-progress',
        '.ytp-ad-skip-button',
        'ytd-promoted-sparkles-web-renderer',
        'ytd-promoted-video-renderer',
        'ytd-action-companion-ad-renderer',
        'ytd-ad-slot-renderer',
        'ytd-companion-ad-slot-renderer',
        'ytd-display-ad-renderer',
        'ytd-in-feed-ad-layout-renderer',
        '[class*="ytp-ce-"]', // Channel/paid elements
      ];
      
      youtubeAdSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            // Double check it's an ad element before removing
            if (element && (element.classList.contains('video-ads') || 
                element.classList.contains('ytp-ad-module') ||
                element.tagName === 'YTD-PROMOTED-VIDEO-RENDERER' ||
                element.tagName === 'YTD-AD-SLOT-RENDERER')) {
              
              // Create a unique identifier for this ad element
              const adId = element.id || element.className || selector + element.innerHTML.slice(0, 50);
              
              // Only count if we haven't seen this ad before
              if (!blockedAdIds.has(adId)) {
                blockedAdIds.add(adId);
                adsBlockedThisRun++;
              }
              
              element.remove();
            }
          });
        } catch (e) {}
      });
      
      // Increment counter only for new ads
      if (adsBlockedThisRun > 0) {
        try {
          chrome.runtime.sendMessage({action: 'incrementBlocked'}, function(response) {
            if (chrome.runtime.lastError) {
              // Extension context invalidated - ignore
            }
          });
        } catch (e) {
          // Extension context invalidated - ignore
        }
      }
      
      // Block ad iframes more aggressively
      const iframes = document.querySelectorAll('iframe');
      let blockedIframes = 0;
      iframes.forEach(iframe => {
        try {
          const src = iframe.src || '';
          if (src.includes('googleadservices') || 
              src.includes('doubleclick') || 
              src.includes('pagead') ||
              src.includes('ads.youtube') ||
              src.includes('adservice')) {
            
            const iframeId = 'iframe_' + src;
            
            // Only count if we haven't seen this iframe before
            if (!blockedAdIds.has(iframeId)) {
              blockedAdIds.add(iframeId);
              blockedIframes++;
            }
            
            iframe.remove();
          }
        } catch (e) {}
      });
      
      // Increment for blocked iframes (only new ones)
      if (blockedIframes > 0) {
        try {
          chrome.runtime.sendMessage({action: 'incrementBlocked'}, function(response) {
            if (chrome.runtime.lastError) {}
          });
        } catch (e) {}
      }
      
      // Remove ad links
      const adLinks = document.querySelectorAll('a');
      adLinks.forEach(link => {
        const href = link.href || '';
        if (href.includes('googleadservices') || 
            href.includes('doubleclick') || 
            href.includes('pagead')) {
          link.closest('ytd-promoted-video-renderer')?.remove();
          link.closest('.ytwFeedAdMetadataViewModelHost')?.remove();
          link.remove();
        }
      });
      
      // Auto-skip video ads by simulating skip button clicks
      const skipButtons = document.querySelectorAll('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, [class*="skip"]');
      let skippedAds = 0;
      skipButtons.forEach(button => {
        try {
          // Create unique ID for this button
          const buttonId = button.id || button.className || 'skip_' + button.textContent;
          
          // Only count if we haven't clicked this button before
          if (!blockedAdIds.has(buttonId)) {
            blockedAdIds.add(buttonId);
            skippedAds++;
          }
          
          button.click();
        } catch (e) {}
      });
      
      // Increment for skipped ads (only new ones)
      if (skippedAds > 0) {
        try {
          chrome.runtime.sendMessage({action: 'incrementBlocked'}, function(response) {
            if (chrome.runtime.lastError) {}
          });
        } catch (e) {}
      }
      
      // Remove ad overlays (only video ad overlays)
      const adOverlays = document.querySelectorAll('.ytp-ad-overlay-container, .ytp-ad-player-overlay, .ytp-ad-message-overlay, .ytp-ad-progress');
      adOverlays.forEach(overlay => {
        overlay.remove();
      });
    }
    
    function isVideoPlayer(element) {
      if (element.tagName === 'VIDEO') return true;
      
      const classes = element.className || '';
      const id = element.id || '';
      
      const videoKeywords = ['video', 'player', 'ytp', 'html5-video', 'video-stream', 'movie_player'];
      return videoKeywords.some(keyword => 
        classes.toLowerCase().includes(keyword) || id.toLowerCase().includes(keyword)
      );
    }
    
    // Main blocking function
    function blockAllAds() {
      if (window.location.hostname.includes('youtube.com')) {
        blockYouTubeAdsAggressively();
      } else {
        blockGenericAds();
      }
    }
    
    function blockGenericAds() {
      if (!blockingActive) return;
      
      // Skip blocking on Google search (avoid breaking search results)
      if (window.location.hostname === 'www.google.com' || 
          window.location.hostname === 'google.com') {
        return;
      }
      
      // Generic ad blocking for other sites
      const genericAdSelectors = [
        '.advertisement',
        '.adsbygoogle',
        '.ad-unit',
        '.ad-wrapper',
        '.sponsored',
        '.promoted',
        '[data-ad]',
        '[data-ads]'
      ];
      
      genericAdSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (!isVideoPlayer(element)) {
              element.remove();
            }
          });
        } catch (e) {}
      });
      
      // More specific selectors to avoid false positives
      const specificAdContainers = document.querySelectorAll('[class*="ad-container"], [id*="ad-container"]');
      specificAdContainers.forEach(container => {
        // Only remove if it's clearly an ad, not just any element with "ad" in the class
        const text = container.textContent || '';
        if (text.includes('advertisement') || text.includes('sponsored')) {
          if (!isVideoPlayer(container)) {
            container.remove();
          }
        }
      });
    }
    
    // Enhanced observer with more frequent checks
    function startAggressiveBlocking() {
      // Initial blocking
      blockAllAds();
      
      // Less frequent interval to improve performance
      if (window.location.hostname.includes('youtube.com')) {
        setInterval(blockAllAds, 2000); // Check every 2 seconds for YouTube
      } else {
        setInterval(blockAllAds, 3000); // Check every 3 seconds for other sites
      }
      
      // Mutation observer for dynamic content (less aggressive)
      let observerTimeout;
      const observer = new MutationObserver(function(mutations) {
        // Debounce observer to avoid excessive calls
        clearTimeout(observerTimeout);
        observerTimeout = setTimeout(function() {
          let hasNewNodes = false;
          mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
              hasNewNodes = true;
            }
          });
          if (hasNewNodes) {
            blockAllAds();
          }
        }, 1000);
      });
      
      // Only observe body, not the entire document
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: false  // Only watch direct children, not everything
        });
      }
    }
    
    // Start the ad blocking
    let blockingActive = true;
    chrome.storage.sync.get({isEnabled: true}, function(items) {
      blockingActive = items.isEnabled;
      
      // Don't track site as protected - we'll track live tabs instead
      
      if (blockingActive) {
        // Wait for page to load completely
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startAggressiveBlocking);
        } else {
          startAggressiveBlocking();
        }
      }
    });
    
    // Listen for toggle messages
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.action === 'toggleBlocking') {
        blockingActive = request.enabled;
        if (blockingActive) {
          startAggressiveBlocking();
        }
        sendResponse({status: 'toggled'});
      }
      return true;
    });
    
    // Additional: Block requests by overriding XMLHttpRequest and fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && (
          url.includes('googleadservices') ||
          url.includes('doubleclick') ||
          url.includes('pagead') ||
          url.includes('/ads/') ||
          url.includes('/ad/')
      )) {
        return Promise.reject(new Error('Blocked by JAblock'));
      }
      return originalFetch.apply(this, args);
    };
    
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      
      xhr.open = function(method, url) {
        if (typeof url === 'string' && (
            url.includes('googleadservices') ||
            url.includes('doubleclick') ||
            url.includes('pagead') ||
            url.includes('/ads/') ||
            url.includes('/ad/')
        )) {
          return;
        }
        originalOpen.apply(this, arguments);
      };
      
      return xhr;
    };
    
  })();