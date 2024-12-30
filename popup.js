// Helper function to save state
function saveState(key, value) {
    chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error saving state:', chrome.runtime.lastError);
        }
    });
}

// Helper function to fetch localized messages
function getLocalizedMessage(key) {
    return chrome.i18n.getMessage(key) || key;
}

// Restore the company list and count
function restoreCompanyList() {
    chrome.storage.local.get('companies', (data) => {
        const companies = data.companies || [];
        const companyList = document.getElementById('company-list');
        const companyCount = document.getElementById('company-count');
        companyCount.textContent = `${companies.length}`;
        companyList.innerHTML = ''; // Clear the list
        companies.forEach((company) => {
            const item = createCompanyItem(company);
            companyList.appendChild(item);
        });
    });
}

// Add new company
function addCompany(companyName) {
    chrome.storage.local.get('companies', (data) => {
        const companies = data.companies || [];
        if (!companies.includes(companyName)) {
            companies.push(companyName);
            chrome.storage.local.set({ companies }, restoreCompanyList);
        }
    });
}

// Remove a company
function removeCompany(companyName) {
    chrome.storage.local.get('companies', (data) => {
        const companies = data.companies || [];
        const index = companies.indexOf(companyName);
        if (index !== -1) {
            companies.splice(index, 1);
            chrome.storage.local.set({ companies }, restoreCompanyList);
        }
    });
}

// Create a company list item
function createCompanyItem(companyName) {
    const div = document.createElement('div');
    div.className = 'company-item';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = companyName;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'X';
    removeBtn.setAttribute('aria-label', getLocalizedMessage('removeCompany'));
    removeBtn.addEventListener('click', () => removeCompany(companyName));
    div.appendChild(nameSpan);
    div.appendChild(removeBtn);
    return div;
}

// Confirm and clear all companies
function clearAllCompanies() {
    if (confirm(getLocalizedMessage('clearConfirmation'))) {
        chrome.storage.local.set({ companies: [] }, restoreCompanyList);
    }
}

// Restore toggle states
function restoreToggleStates() {
    const toggleKeys = ['applied', 'promoted', 'dismissed', 'viewed', 'show-buttons'];
    chrome.storage.local.get(toggleKeys, (data) => {
        if (data['show-buttons'] === undefined) {
            chrome.storage.local.set({ 'show-buttons': true });
        }
        toggleKeys.forEach((toggleKey) => {
            const toggle = document.getElementById(`toggle-${toggleKey}`);
            if (toggle) {
                toggle.checked = data[toggleKey] ?? toggleKey === 'show-buttons';
                toggle.title = getLocalizedMessage(`quickFilter${toggleKey[0].toUpperCase()}${toggleKey.slice(1)}Tooltip`);
                toggle.addEventListener('change', () => saveState(toggleKey, toggle.checked));
            }
        });
    });
}

// Set localized UI text
function setLocalizedText() {
    document.getElementById('header-title').textContent = getLocalizedMessage('headerTitle');
    document.getElementById('add-company-btn').textContent = getLocalizedMessage('addButton');
    document.getElementById('clear-all-btn').textContent = getLocalizedMessage('clearAllButton');
    document.getElementById('new-company').placeholder = getLocalizedMessage('addCompanyPlaceholder');
    document.getElementById('footer-text').textContent = getLocalizedMessage('footerText');
    document.getElementById('support-link').textContent = getLocalizedMessage('helpText');
    document.querySelector('#bmc-container a').textContent = getLocalizedMessage('donateText');

    // Update Quick Filters Section
    document.querySelector('.section-title').textContent = getLocalizedMessage('quickFiltersTitle');
    document.querySelector('#toggle-applied-label').textContent = getLocalizedMessage('quickFilterApplied');
    document.querySelector('#toggle-promoted-label').textContent = getLocalizedMessage('quickFilterPromoted');
    document.querySelector('#toggle-dismissed-label').textContent = getLocalizedMessage('quickFilterDismissed');
    document.querySelector('#toggle-viewed-label').textContent = getLocalizedMessage('quickFilterViewed');
    document.querySelector('#show-icon-label').textContent = getLocalizedMessage('showButtonsToggle');

    // Update Companies Section
    document.getElementById('companies-label').textContent = getLocalizedMessage('companies');
}

function addTooltips() {
    document.getElementById('toggle-applied-label').title = getLocalizedMessage('quickFilterAppliedTooltip');
    document.getElementById('toggle-promoted-label').title = getLocalizedMessage('quickFilterPromotedTooltip');
    document.getElementById('toggle-dismissed-label').title = getLocalizedMessage('quickFilterDismissedTooltip');
    document.getElementById('toggle-viewed-label').title = getLocalizedMessage('quickFilterViewedTooltip');
    document.getElementById('show-icon-label').title = getLocalizedMessage('showButtonTooltip');
}


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    restoreCompanyList();
    restoreToggleStates();
    setLocalizedText();
    addTooltips();

    document.getElementById('clear-all-btn').addEventListener('click', clearAllCompanies);

        // Attach event listener for Add Company button
        document.getElementById('add-company-btn').addEventListener('click', () => {
            const input = document.getElementById('new-company');
            const companyName = input.value.trim();
            if (companyName) {
                addCompany(companyName);
                input.value = ''; // Clear the input field after adding the company
            }
        });

    const versionNumber = chrome.runtime.getManifest().version;
    if (versionNumber) document.getElementById('version-number').textContent = `v${versionNumber}`;
});

// Add event listener for Enter key in the company input box
document.getElementById('new-company').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = document.getElementById('new-company');
        const companyName = input.value.trim();
        if (companyName) {
            addCompany(companyName);
            input.value = '';
        }
    }
});
