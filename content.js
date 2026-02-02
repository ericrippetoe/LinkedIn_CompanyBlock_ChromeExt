// LinkedIn Job Blocker - Full Refactored Content Script
// Date: 2025-12

// ============================================================================
// Constants
// ============================================================================
const TIMING = {
  TOAST_SHOW_DELAY: 100,      // ms - delay before toast animation starts
  TOAST_DISPLAY: 3000,        // ms - how long toast stays visible
  TOAST_FADE_OUT: 300,        // ms - toast fade out animation duration
  TOAST_BATCH_WINDOW: 1500,   // ms - window to batch multiple hide notifications
  NOTICE_SHOW_DELAY: 50,      // ms - delay before notice animation starts
  NOTICE_FADE_OUT: 300,       // ms - notice fade out animation duration
  DEBOUNCE_DELAY: 300         // ms - mutation observer debounce window
};

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

    // Refresh notice state
    this.refreshNoticeShown = false;

    // Pre-compiled regex patterns for performance
    this.patterns = {
      dismissed: /We['']t show you this job again\./i,
      applied: /Applied/i,
      promoted: /Promoted/i,
      viewed: /Viewed/i
    };

    // Debug flag (set to false for production)
    this.debug = false;

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
      chrome.storage.sync.get(keys, (data) => {
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
      chrome.storage.sync.set(data, () => {
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
    if (!this.debug) return;
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
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = typeof message === 'string' ? message : String(message);
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, TIMING.TOAST_SHOW_DELAY);

    // Remove after display duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), TIMING.TOAST_FADE_OUT);
    }, TIMING.TOAST_DISPLAY);
  }

  // Batchable toast scheduler
  scheduleToastNotification(count) {
    this.toastHiddenCount += count;
    clearTimeout(this.toastBatchTimer);
    this.toastBatchTimer = setTimeout(() => {
      if (this.toastHiddenCount > 0) {
        const msg = this.toastHiddenCount === 1
          ? '1 Job Hidden'
          : `${this.toastHiddenCount} Jobs Hidden`;
        this.showToast(msg);
        this.toastHiddenCount = 0;
      }
    }, TIMING.TOAST_BATCH_WINDOW);
  }

  // Helper to get localized messages
  getLocalizedMessage(key) {
    return chrome.i18n.getMessage(key) || key;
  }

  // Show refresh notice banner
  showRefreshNotice() {
    if (this.refreshNoticeShown) return;

    // Remove any existing notice
    const existing = document.querySelector('.ljb-refresh-notice');
    if (existing) existing.remove();

    const notice = document.createElement('div');
    notice.className = 'ljb-refresh-notice';
    const iconUrl = chrome.runtime.getURL('icons/icon-16x16.png');
    notice.innerHTML = `
      <div class="ljb-refresh-notice__text">
        <img class="ljb-refresh-notice__icon" src="${iconUrl}" alt="" />
        <span>${this.getLocalizedMessage('refreshNoticeText') || 'LinkedIn Jobs Blocker settings have changed. Please refresh for an accurate view.'}</span>
      </div>
      <button class="ljb-refresh-notice__btn">${this.getLocalizedMessage('refreshButton') || 'Refresh Page'}</button>
      <button class="ljb-refresh-notice__dismiss">${this.getLocalizedMessage('dismissButton') || 'Dismiss'}</button>
    `;

    // Refresh button handler
    notice.querySelector('.ljb-refresh-notice__btn').addEventListener('click', () => {
      location.reload();
    });

    // Dismiss button handler
    notice.querySelector('.ljb-refresh-notice__dismiss').addEventListener('click', () => {
      notice.classList.remove('show');
      setTimeout(() => notice.remove(), TIMING.NOTICE_FADE_OUT);
      this.refreshNoticeShown = false;
    });

    document.body.appendChild(notice);

    // Trigger animation
    setTimeout(() => notice.classList.add('show'), TIMING.NOTICE_SHOW_DELAY);
    this.refreshNoticeShown = true;
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
        background-color: #0D7377;
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
        fill: #0D7377;
        cursor: pointer;
        transition: fill 0.3s ease;
      }

      .block-button-container:hover svg {
        fill: #095557;
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

      /* Refresh Notice Banner */
      .ljb-refresh-notice {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #0D7377 0%, #095557 100%);
        color: #ffffff;
        padding: 10px 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        z-index: 10001;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-size: 14px;
        transform: translateY(-100%);
        transition: transform 0.3s ease;
      }

      .ljb-refresh-notice.show {
        transform: translateY(0);
      }

      .ljb-refresh-notice__text {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ljb-refresh-notice__icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      .ljb-refresh-notice__btn {
        background: #ffffff;
        color: #0D7377;
        border: none;
        padding: 6px 14px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s ease, transform 0.1s ease;
      }

      .ljb-refresh-notice__btn:hover {
        background: #f0f0f0;
        transform: scale(1.02);
      }

      .ljb-refresh-notice__dismiss {
        background: transparent;
        color: #ffffff;
        border: 1px solid rgba(255,255,255,0.5);
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .ljb-refresh-notice__dismiss:hover {
        background: rgba(255,255,255,0.1);
      }
    `;
    document.head.appendChild(style);
  }

  // =========================================================================
  // Block Button Management
  // =========================================================================

  addBlockButton(listing, companyName) {
    // Check if 'show-buttons' is enabled
    if (!this.cachedSettings['show-buttons']) return;

    // Early exit if button already added (tracked by data attribute)
    if (listing.hasAttribute('data-block-btn-added')) return;

    const footer = listing.querySelector('.job-card-list__footer-wrapper');
    if (!footer || footer.querySelector('.job-card-container__footer-item.block-company')) {
      return;
    }

    // Create button element
    const blockButton = document.createElement('li');
    blockButton.className = 'job-card-container__footer-item inline-flex align-items-center block-company';

    blockButton.innerHTML = `
      <div class="block-button-container" title="Block this company">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#0D7377" viewBox="0 0 16 16" aria-hidden="true" role="none">
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

    // Mark listing as processed
    listing.setAttribute('data-block-btn-added', 'true');
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

    // Query DOM once
    const jobListings = document.querySelectorAll(
      'li[id^="ember"]:not(.hidden-job), li.discovery-templates-entity-item:not(.hidden-job)'
    );

    // Use Set for O(1) lookups instead of O(n) Array.includes()
    const blockedSet = new Set(companiesToBlock);

    let hiddenByCompanyCount = 0;

    jobListings.forEach((listing) => {
      const companyNameElement = listing.querySelector('.artdeco-entity-lockup__subtitle span');
      if (!companyNameElement) return;

      const companyName = companyNameElement.textContent.trim();

      // Block by company - O(1) lookup with Set
      if (blockedSet.has(companyName)) {
        listing.style.display = 'none';
        listing.classList.add('hidden-job');
        hiddenByCompanyCount++;
        if (this.debug) {
          console.info(`Job hidden for company: ${companyName}`);
        }
      } else {
        // Add block button for visible jobs
        this.addBlockButton(listing, companyName);
      }
    });

    // Hide by footer text settings and collect count - reuse jobListings
    const hiddenBySettingsCount = this.hideJobsByFooterText(jobListings);

    // Show one batched toast for all hidden items
    const totalHidden = hiddenByCompanyCount + hiddenBySettingsCount;
    if (totalHidden > 0) {
      this.scheduleToastNotification(totalHidden);
    }
  }

  // Enhanced footer text logic with dismiss via class and text fallback
  hideJobsByFooterText(jobListings) {
    const { applied, promoted, viewed, dismissed } = this.cachedSettings;

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

      // Use pre-compiled regex patterns for performance
      const dismissedMatches = !!(dismissed && this.patterns.dismissed.test(dismissText));
      const appliedMatches = !!(applied && this.patterns.applied.test(footerText));
      const promotedMatches = !!(promoted && this.patterns.promoted.test(footerText));
      const viewedMatches = !!(viewed && this.patterns.viewed.test(footerText));

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
    }, TIMING.DEBOUNCE_DELAY);
  }

  setupStorageListener() {
    // Listen for changes from other tabs/popups
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        let needsRefreshNotice = false;

        Object.keys(changes).forEach((key) => {
          const oldValue = changes[key].oldValue;
          const newValue = changes[key].newValue;
          this.cachedSettings[key] = newValue;

          // Check if a filter was turned OFF (true -> false)
          // This means previously hidden jobs should now be visible, but they can't unhide without refresh
          if (['applied', 'promoted', 'dismissed', 'viewed'].includes(key)) {
            if (oldValue === true && newValue === false) {
              needsRefreshNotice = true;
            }
          }

          // Check if a company was removed from the block list
          if (key === 'companies') {
            const oldCompanies = oldValue || [];
            const newCompanies = newValue || [];
            // If any company was removed, jobs from that company should now be visible
            if (oldCompanies.some(company => !newCompanies.includes(company))) {
              needsRefreshNotice = true;
            }
          }
        });

        // Always run hide logic for newly hidden items
        this.hideListedCompanies();

        // Show refresh notice if settings changed in a way that requires refresh
        if (needsRefreshNotice) {
          this.showRefreshNotice();
        }
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
