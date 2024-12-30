// Debugging: Log all settings to the console
function logSettings() {
  const keysToLog = ['applied', 'promoted', 'dismissed', 'viewed', 'show-buttons', 'companies'];
  chrome.storage.local.get(keysToLog, (data) => {
    console.info('=== Extension Settings ===');
    keysToLog.forEach((key) => {
      if (key === 'companies') {
        console.info(`Blocked Companies: ${data[key]?.length || 0}`, data[key] || []);
      } else {
        console.info(`${key}: ${data[key] === undefined ? 'Not Set (defaulting to false)' : data[key]}`);
      }
    });
    console.info('===========================');
  });
}

// Run the logging function on script load
logSettings();

// Function to fetch localized messages
function getLocalizedMessage(key) {
  return chrome.i18n.getMessage(key) || key; // Fallback to the key if no message found
}

// Function to show toast notifications
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;

  document.body.appendChild(toast);

  // Make the toast visible
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  // Remove the toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300); // Ensure it's removed after the transition
  }, 3000);
}

// Inject CSS for toast notifications and the button
const style = document.createElement('style');
style.textContent = `
  .toast-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #255898;
    color: #ffffff;
    padding: 10px 20px;
    border-radius: 5px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

  .block-button-container {
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
    gap: 8px;
  }

  .block-button-container:hover #hoverMessage {
    display: block;
    opacity: 1;
  }

  .block-button-container svg {
    fill: #255898;
    cursor: pointer;
    transition: fill 0.3s ease;
  }

  .block-button-container:hover svg {
    fill: #005582;
  }

  .block-bullet {
    width: 6px;
    height: 6px;
    background-color: #255898;
    border-radius: 50%;
  }

  #hoverMessage {
    display: none;
    color: #ffffff;
    padding: 4px 7px;
    background-color: #333333;
    border-radius: 5px;
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    z-index: 999;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
`;
document.head.appendChild(style);

function addBlockButton(listing, companyName) {
  // Check if 'show-buttons' is enabled
  chrome.storage.local.get('show-buttons', (data) => {
    if (!data['show-buttons']) return; // Exit if the feature is disabled

    const footer = listing.querySelector('.job-card-list__footer-wrapper');
    if (footer && !footer.querySelector('.job-card-container__footer-item.block-company')) {
      // Create a new LI element for the block button
      const blockButton = document.createElement('li');
      blockButton.className = 'job-card-container__footer-item inline-flex align-items-center block-company';

      // Add SVG icon with hover message
      blockButton.innerHTML = `
        <div style="position: relative; display: inline-flex; align-items: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#255898" class="bi bi-eye-slash-fill" viewBox="0 0 16 16" aria-hidden="true" role="none" style="cursor: pointer;">
            <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"></path>
            <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"></path>
          </svg>
          <div id="hoverMessage" style="display: none; color: #fff; padding: 4px 8px; background-color: #333; border-radius: 4px; position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%); font-size: 10px; white-space: nowrap; z-index: 1000; transition: opacity 0.3s ease;">
            ${getLocalizedMessage('tooltipBlockButton')}
            <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-style: solid; border-width: 5px 5px 0; border-color: #333 transparent transparent;"></div>
          </div>
        </div>
      `;

      // Add hover behavior for the message
      const hoverMessage = blockButton.querySelector('#hoverMessage');
      blockButton.addEventListener('mouseenter', () => {
        hoverMessage.style.display = 'block';
        hoverMessage.style.opacity = '1';
      });
      blockButton.addEventListener('mouseleave', () => {
        hoverMessage.style.opacity = '0';
        setTimeout(() => (hoverMessage.style.display = 'none'), 300);
      });

      // Add an event listener for clicking the block button
      blockButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the click from propagating to parent elements
        e.preventDefault(); // Prevent default behavior, like navigation
        chrome.storage.local.get('companies', (data) => {
          const companies = data.companies || [];
          if (!companies.includes(companyName)) {
            companies.push(companyName);
            chrome.storage.local.set({ companies }, () => {
              hideListedCompanies(); // Re-run the hiding logic
            });
          }
        });
      });

      // Append the new LI to the footer UL
      footer.appendChild(blockButton);
    }
  });
}


// Function to hide job listings based on the company names stored
function hideListedCompanies() {
  chrome.storage.local.get('companies', function (data) {
    const companiesToBlock = data.companies || [];
    const jobListings = document.querySelectorAll('li[id^="ember"]:not(.hidden-job), li.discovery-templates-entity-item:not(.hidden-job)');

    jobListings.forEach((listing) => {
      const companyNameElement = listing.querySelector('.artdeco-entity-lockup__subtitle span');
      if (companyNameElement) {
        const companyName = companyNameElement.textContent.trim();
        if (companiesToBlock.includes(companyName)) {
          listing.style.display = 'none';
          listing.classList.add('hidden-job');
          console.info(`Job hidden for company: ${companyName}`);
          const message = getLocalizedMessage('toastBlockedJob').replace('{company}', companyName);
          showToast(message); // Trigger toast notification
        } else {
          addBlockButton(listing, companyName); // Add block button for visible jobs
        }
      }
    });

    // Call the function to hide jobs based on footer text settings
    hideJobsByFooterText();
  });
}

// Function to hide jobs based on footer text and settings
function hideJobsByFooterText() {
  chrome.storage.local.get(['applied', 'promoted', 'viewed', 'dismissed'], (settings) => {
    const { applied, promoted, viewed, dismissed } = settings;

    // Define keywords to match for each setting
    const footerKeywords = {
      applied: applied ? 'Applied' : null,
      promoted: promoted ? 'Promoted' : null,
      viewed: viewed ? 'Viewed' : null,
      dismissed: dismissed ? 'We won’t show you this job again.' : null,
    };

    // Select all job listings
    const jobListings = document.querySelectorAll('li[id^="ember"]:not(.hidden-job), li.discovery-templates-entity-item:not(.hidden-job)');

    jobListings.forEach((listing) => {
      const footer = listing.querySelector('.job-card-list__footer-wrapper');
      const dismissNotice = listing.querySelector('.job-card-container__footer-item--highlighted');

      if (footer || dismissNotice) {
        const footerText = footer ? footer.textContent || '' : '';
        const dismissText = dismissNotice ? dismissNotice.textContent || '' : '';

        // Check if any keyword matches the footer text or dismiss text
        if (
          (footerKeywords.applied && footerText.includes(footerKeywords.applied)) ||
          (footerKeywords.promoted && footerText.includes(footerKeywords.promoted)) ||
          (footerKeywords.viewed && footerText.includes(footerKeywords.viewed)) ||
          (footerKeywords.dismissed && dismissText.includes(footerKeywords.dismissed))
        ) {
          // Hide the listing and mark it as processed
          listing.style.display = 'none';
          listing.classList.add('hidden-job');
        }
      }
    });
  });
}

// Debounce function to reduce rapid calls
let debounceTimer;
function debounce(callback, delay) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(callback, delay);
}

// Ensure the script runs after the LinkedIn page has loaded
document.addEventListener('DOMContentLoaded', hideListedCompanies);

// Set up a mutation observer to handle dynamic content loading
const observer = new MutationObserver(() => {
  debounce(hideListedCompanies, 200);
});

observer.observe(document.body, { childList: true, subtree: true });

