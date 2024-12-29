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

// Inject CSS for toast notifications
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
    display: flex; /* Use flexbox to align icon and text */
    align-items: center;
    gap: 10px; /* Space between icon and text */
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .toast-notification img {
    width: 24px; /* Set the size of your icon */
    height: 24px;
    border-radius: 50%; /* Optional, for circular icons */
  }

  .toast-notification.show {
    opacity: 1;
    transform: translateY(0);
  }
`;
document.head.appendChild(style);


// Function to hide job listings based on the company names stored
function hideListedCompanies() {
  chrome.storage.local.get("companies", function (data) {
    if (data.companies && data.companies.length) {
      const companiesToBlock = data.companies; // Already an array

      // Process only unhidden job listings to avoid redundant work
      const jobListings = document.querySelectorAll('li[id^="ember"]:not(.hidden-job), li.discovery-templates-entity-item:not(.hidden-job)');
      jobListings.forEach((listing) => {
        const companyNameElement = listing.querySelector('.artdeco-entity-lockup__subtitle span');
        if (companyNameElement) {
          const companyName = companyNameElement.textContent.trim();
          if (companiesToBlock.includes(companyName)) {
            listing.style.display = 'none';
            listing.classList.add('hidden-job'); // Mark as processed
            showToast(`Blocked job from: ${companyName}`); // Show toast notification
          }
        }
      });
    }
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
  debounce(hideListedCompanies, 300); // Debounce for 300ms
});

observer.observe(document.body, { childList: true, subtree: true });
