# Jo Adblock

A lightweight and efficient ad blocker for Chrome that blocks YouTube ads and intrusive content across all websites.

## Features

- 🚫 **Advanced YouTube Ad Blocking** - Blocks video ads, banners, and sponsored content
- ⚡ **Fast Performance** - In-memory counters with optimized storage for lightning-fast blocking
- 🔄 **Live Tab Tracking** - Real-time ad blocking counter that automatically adjusts when tabs are closed
- ✅ **Custom Whitelist** - Allow ads on specific domains if needed
- 🎨 **Modern UI** - Beautiful gradient design with intuitive controls
- 🔒 **Privacy Focused** - No tracking, no data collection, all local processing

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension directory
6. The extension is now installed and ready to use!

## Usage

1. Click the extension icon in your toolbar
2. Toggle the ad blocker on/off with the switch
3. View live statistics:
   - **Ads Blocked (Live)** - Shows ads blocked in current browsing session
   - **Sites Protected** - Shows number of currently open tabs
4. Add domains to the whitelist if you want to allow ads on specific sites
5. Use the reset button to clear the live counter

## How It Works

### Dynamic Ad Detection System

Jo Adblock uses **intelligent, adaptive blocking** that learns and adapts to changing ad patterns:

- **Multiple Detection Layers**: 
  - Selector-based detection for known ad elements
  - Content analysis to identify ad-like patterns
  - URL pattern matching for ad networks
  - Behavioral analysis of suspicious elements

- **Self-Learning Algorithm**: 
  - Continuously monitors page changes via MutationObserver
  - Detects new ad elements as they're dynamically injected
  - Adapts to sites that constantly change their ad URLs
  - Blocks ads even when they use obfuscated class names or IDs

- **Real-Time Adaptation**:
  - Scans page every 2-3 seconds for new ad elements
  - Identifies ads by their characteristics, not just fixed patterns
  - Remembers blocked ad patterns to avoid false positives
  - Filters out legitimate content while catching real ads

### Counter System

- **Per-Tab Tracking**: Each tab maintains its own ad count
- **Automatic Adjustment**: When a tab closes, its ad count is subtracted from the total
- **Session Storage**: Uses `chrome.storage.session` for persistence across page reloads
- **Auto-Reset**: Counter automatically resets when all tabs are closed or browser restarts
- **Cap at 62**: Live counter resets to 0 after reaching 62 ads (configurable)

## Technical Details

### File Structure
```
├── manifest.json       # Extension configuration
├── background.js       # Service worker with in-memory counters
├── content.js         # Ad blocking logic injected into pages
├── popup.html         # Extension popup UI
├── popup.js          # Popup functionality
├── styles.css        # Modern gradient styling
└── icons/            # Extension icons
```

### Permissions
- `storage` - Save user preferences and whitelist
- `activeTab` - Access current tab information
- `declarativeNetRequest` - Block ad requests

### Key Features
- **In-Memory Counters**: All counting happens in the background service worker for maximum performance
- **Throttled Storage**: Session data saved every 2 seconds to minimize I/O
- **Security Hardened**: XSS protection, input validation, and Content Security Policy

### Ad Detection Algorithm

The ad blocker works by:

1. **Static Pattern Matching**: Identifies known ad selectors (class names, IDs, tag names)
2. **Dynamic Content Analysis**: Analyzes text content and HTML structure for ad-like patterns
3. **URL Filtering**: Blocks requests containing ad network URLs (googleadservices, doubleclick, etc.)
4. **Behavioral Detection**: Identifies elements that behave like ads (high z-index overlays, auto-playing content)
5. **MutationObserver**: Watches for new elements added to the page and evaluates them
6. **Smart Deduplication**: Uses Set-based tracking to avoid counting the same ad multiple times

This multi-layered approach ensures that ads are caught even when sites change their implementation.

## Privacy

This extension:
- ✅ Does NOT collect any user data
- ✅ Does NOT track your browsing history
- ✅ Does NOT send data to external servers
- ✅ Processes everything locally on your device

## Development

Built with:
- Vanilla JavaScript (no frameworks)
- Chrome Extension Manifest V3
- Modern ES6+ features

## License

Copyright © 2024 Joseph A.

This extension is provided as-is for personal use.

## Support

For issues, questions, or contributions, please open an issue on the repository.

---

**Made with ❤️ by Joseph A.**
