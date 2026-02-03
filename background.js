// background.js - Service worker for LinkedIn Job Blocker

// Set uninstall URL for feedback survey
chrome.runtime.setUninstallURL('https://toadstonelabs.com/uninstall/linkedin-jobs-blocker/');

// Handle extension install/update events
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open getting started page on first install
    chrome.tabs.create({
      url: 'https://toadstonelabs.com/support/linkedin-jobs-blocker/#getting-started'
    });
  }
});
