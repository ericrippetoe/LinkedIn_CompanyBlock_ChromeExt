// LinkedIn Job Blocker - Full Refactored Content Script
// Date: 2025-12

class LinkedInJobBlocker {
  constructor() {
    // In-memory cache of settings
    this.cachedSettings = {};

    // Debounce for mutation observer
    this.debounceTimer = null;

    // Blocker state
    this.isUpdating = false;

    // Toast batching
    this.toastHiddenCount = 0;
    this.toastBatchTimer = null;

    // Initialize
    this.init();
  }

  // Initialize the extension
  init() {
    this.injectStyles();
    this.loadSettings();
    this.setupObserver();
    this.setupStorageListener();
    this.setupDOMContentLoaded();
  }

  // =========================================================================
  // Settings Management
  // =========================================================================

  loadSettings() {
    this.safeStorageGet(
      ['applied', 'promoted', 'dismissed', 'viewed', 'show-buttons', 'companies'],
      (data) => {
        this.cachedSettings = data;
        this.logSettings();
        this.hideListedCompanies();
      }
    );
  }

  safeStorageGet(keys, callback) {
    try {
      chrome.storage.local.get(keys, (data) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          return;
        }
        callback(data);
      });
    } catch (error) {
      console.error('Failed to read storage:', error);
    }
  }

  safeStorageSet(data, callback) {
    try {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          return;
        }
        if (callback) callback();
      });
    } catch (error) {
      console.error('Failed to write storage:', error);
    }
  }

  // =========================================================================
  // Logging & Notifications
  // =========================================================================

  logSettings() {
    console.info('=== Extension Settings ===');
    console.info(`Applied: ${this.cachedSettings.applied === undefined ? 'Not Set (defaulting to false)' : this.cachedSettings.applied}`);
    console.info(`Promoted: ${this.cachedSettings.promoted === undefined ? 'Not Set (defaulting to false)' : this.cachedSettings.promoted}`);
    console.info(`Dismissed: ${this.cachedSettings.dismissed === undefined ? 'Not Set (defaulting to false)' : this.cachedSettings.dismissed}`);
    console.info(`Viewed: ${this.cachedSettings.viewed === undefined ? 'Not Set (defaulting to false)' : this.cachedSettings.viewed}`);
    console.info(`Show Buttons: ${this.cachedSettings['show-buttons'] === undefined ? 'Not Set (defaulting to false)' : this.cachedSettings['show-buttons']}`);
    const companies = this.cachedSettings.companies || [];
    console.info(`Blocked Companies: ${companies.length}`, companies);
    console.info('===========================');
  }

  showToast(message) {
    // If message is a string, show; if numeric (counts), format accordingly
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = typeof message === 'string' ? message : String(message);
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Batchable toast scheduler
  scheduleToastNotification(count) {
    this.toastHiddenCount += count;
    clearTimeout(this.toastBatchTimer);
    // 1.5s window to batch
    this.toastBatchTimer = setTimeout(() => {
      if (this.toastHiddenCount > 0) {
        const msg = this.toastHiddenCount === 1
          ? '1 Job Hidden'
          : `${this.toastHiddenCount} Jobs Hidden`;
        this.showToast(msg);
        this.toastHiddenCount = 0;
      }
    }, 1500);
  }

  // Helper to get localized messages
  getLocalizedMessage(key) {
    return chrome.i18n.getMessage(key) || key;
  }

  // =========================================================================
  // Styles Management
  // =========================================================================

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Toast Notifications */
      .toast-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #255898;
        color: #ffffff;
        padding: 10px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      .toast-notification.show {
        opacity: 1;
        transform: translateY(0);
      }

      /* Block Button Container */
      .block-button-container {
        position: relative;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        gap: 8px;
      }

      .block-button-container svg {
        fill: #255898;
        cursor: pointer;
        transition: fill 0.3s ease;
      }

      .block-button-container:hover svg {
        fill: #005582;
      }

      /* Tooltip */
      .block-button__tooltip {
        display: none;
        color: #ffffff;
        padding: 6px 10px;
        background-color: #333333;
        border-radius: 4px;
        position: absolute;
        bottom: 120%;
        left: 50%;
        transform: translateX(-50%);
        font-size: 11px;
        z-index: 1000;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .block-button-container:hover .block-button__tooltip {
        display: block;
        opacity: 1;
      }

      /* Tooltip arrow */
      .block-button__tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 5px 5px 0;
        border-color: #333333 transparent transparent;
      }

      /* Wrapper tweaks for LinkedIn card visuals remain minimal */
    `;
    document.head.appendChild(style);
  }

  // =========================================================================
  // Block Button Management
  // =========================================================================

  addBlockButton(listing, companyName) {
    // Check if 'show-buttons' is enabled
    if (!this.cachedSettings['show-buttons']) return;

    const footer = listing.querySelector('.job-card-list__footer-wrapper');
    if (!footer || footer.querySelector('.job-card-container__footer-item.block-company')) {
      return;
    }

    // Create button element
    const blockButton = document.createElement('li');
    blockButton.className = 'job-card-container__footer-item inline-flex align-items-center block-company';

    blockButton.innerHTML = `
      <div class="block-button-container" title="Block this company">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#255898" viewBox="0 0 16 16" aria-hidden="true" role="none">
          <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"></path>
          <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"></path>
        </svg>
        <span class="block-button__tooltip">${this.getLocalizedMessage('tooltipBlockButton') || 'Block this company'}</span>
      </div>
    `;

    // Add click handler
    blockButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.handleBlockCompany(companyName);
    });

    footer.appendChild(blockButton);
  }

  handleBlockCompany(companyName) {
    if (this.isUpdating) return; // Prevent race condition
    this.isUpdating = true;

    const companies = this.cachedSettings.companies || [];
    if (!companies.includes(companyName)) {
      companies.push(companyName);
      this.safeStorageSet({ companies }, () => {
        this.cachedSettings.companies = companies;
        this.hideListedCompanies();
        this.isUpdating = false;
      });
    } else {
      this.isUpdating = false;
    }
  }

  // =========================================================================
  // Job Hiding Logic
  // =========================================================================

  hideListedCompanies() {
    const companiesToBlock = this.cachedSettings.companies || [];
    const jobListings = document.querySelectorAll(
      'li[id^="ember"]:not(.hidden-job), li.discovery-templates-entity-item:not(.hidden-job)'
    );

    let hiddenByCompanyCount = 0;
    let hiddenBySettingsCount = 0;

    jobListings.forEach((listing) => {
      const companyNameElement = listing.querySelector('.artdeco-entity-lockup__subtitle span');
      if (!companyNameElement) return;

      const companyName = companyNameElement.textContent.trim();

      // Block by company
      if (companiesToBlock.includes(companyName)) {
        listing.style.display = 'none';
        listing.classList.add('hidden-job');
        hiddenByCompanyCount++;
        console.info(`Job hidden for company: ${companyName}`);
      } else {
        // Add block button for visible jobs
        this.addBlockButton(listing, companyName);
      }
    });

    // Hide by footer text settings and collect count
    hiddenBySettingsCount = this.hideJobsByFooterText();

    // Show one batched toast for all hidden items
    const totalHidden = hiddenByCompanyCount + hiddenBySettingsCount;
    if (totalHidden > 0) {
      this.scheduleToastNotification(totalHidden);
    }
  }

  // Enhanced footer text logic with dismiss via class and text fallback
  hideJobsByFooterText() {
    const { applied, promoted, viewed, dismissed } = this.cachedSettings;

    const jobListings = document.querySelectorAll(
      'li[id^="ember"]:not(.hidden-job), li.discovery-templates-entity-item:not(.hidden-job)'
    );

    let hiddenCount = 0;

    jobListings.forEach((listing) => {
      // 1) Dismissed via class on inner container (best-effort)
      if (dismissed) {
        const dismissedContainer = listing.querySelector('.job-card-container.job-card-list--is-dismissed');
        if (dismissedContainer) {
          listing.style.display = 'none';
          listing.classList.add('hidden-job');
          hiddenCount++;
          return;
        }
      }

      // 2) Footer-based checks for applied / promoted / viewed / dismissed text
      const footer = listing.querySelector('.job-card-list__footer-wrapper');
      const dismissNotice = listing.querySelector('.job-card-container__footer-item--highlighted');

      if (!footer && !dismissNotice) {
        return;
      }

      const footerText = footer ? (footer.textContent || '') : '';
      const dismissTextRaw = dismissNotice ? (dismissNotice.textContent || '') : '';

      // Normalize dismiss text
      const dismissText = dismissTextRaw.trim().replace(/\s+/g, ' ');

      const dismissedMatches = !!(dismissed && /We['’]t show you this job again\./i.test(dismissText));
      const appliedMatches = !!(applied && /Applied/i.test(footerText));
      const promotedMatches = !!(promoted && /Promoted/i.test(footerText));
      const viewedMatches = !!(viewed && /Viewed/i.test(footerText));

      if (appliedMatches || promotedMatches || viewedMatches || dismissedMatches) {
        listing.style.display = 'none';
        listing.classList.add('hidden-job');
        hiddenCount++;
      }
    });

    return hiddenCount;
  }

  // =========================================================================
  // Observer & Event Listeners
  // =========================================================================

  setupDOMContentLoaded() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.hideListedCompanies());
    } else {
      this.hideListedCompanies();
    }
  }

  setupObserver() {
    // Target specific job container instead of entire document.body
    const jobContainer =
      document.querySelector('[data-test-id="jobs-search-results"]') ||
      document.querySelector('.jobs-search-results__list-wrapper') ||
      document.body;

    const observer = new MutationObserver(() => {
      this.debounceHideJobs();
    });

    observer.observe(jobContainer, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  }

  debounceHideJobs() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.hideListedCompanies();
    }, 300); // Debounce window
  }

  setupStorageListener() {
    // Listen for changes from other tabs/popups
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        Object.keys(changes).forEach((key) => {
          this.cachedSettings[key] = changes[key].newValue;
        });
        this.hideListedCompanies();
      }
    });
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  // Muted: no-op placeholder if you want future extension hooks
}

// Initialize the extension
new LinkedInJobBlocker();
