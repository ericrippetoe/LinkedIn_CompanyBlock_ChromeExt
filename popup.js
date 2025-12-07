// Helper function to save state
function saveState(key, value) {
    chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error saving state:', chrome.runtime.lastError);
        }
    });
}

function toggleCompanies() {
    const companyList = document.getElementById('company-list');
    const companyBadge = document.querySelector('.company-badge');
    
    if (companyList.style.display === 'none' || !companyList.style.display) {
        companyList.style.display = 'flex';
        companyBadge.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
    } else {
        companyList.style.display = 'none';
        companyBadge.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// Helper function to fetch localized messages with placeholders
function getLocalizedMessage(key, params = {}) {
    let message = chrome.i18n.getMessage(key) || key;
    Object.keys(params).forEach(param => {
        message = message.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });
    return message;
}

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="icon">${type === 'success' ? '✅' : '⚠️'}</span>
        ${message}
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Restore the company list and count
function restoreCompanyList() {
    chrome.storage.local.get('companies', (data) => {
        const companies = data.companies || [];
        const companyCount = document.getElementById('company-count');
        const companyCountBadge = document.getElementById('company-count-badge');
        
        if (companyCount) companyCount.textContent = `${companies.length}`;
        if (companyCountBadge) companyCountBadge.textContent = `${companies.length}`;
        
        const companyList = document.getElementById('company-list');
        companyList.innerHTML = '';
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
            chrome.storage.local.set({ companies }, () => {
                restoreCompanyList();
                showToast(getLocalizedMessage('toastCompanyAdded', {company: companyName}), 'success');
            });
        } else {
            showToast(getLocalizedMessage('toastCompanyExists', {company: companyName}), 'error');
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
            chrome.storage.local.set({ companies }, () => {
                restoreCompanyList();
                showToast(getLocalizedMessage('toastCompanyRemoved', {company: companyName}), 'success');
            });
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
        chrome.storage.local.set({ companies: [] }, () => {
            restoreCompanyList();
            showToast(getLocalizedMessage('toastAllCleared'), 'success');
        });
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
    document.getElementById('footer-text').innerHTML = getLocalizedMessage('footerText');

    document.querySelector('#quick-filters-title').textContent = getLocalizedMessage('quickFiltersTitle');
    document.querySelector('#toggle-applied-label').textContent = getLocalizedMessage('quickFilterApplied');
    document.querySelector('#toggle-promoted-label').textContent = getLocalizedMessage('quickFilterPromoted');
    document.querySelector('#toggle-dismissed-label').textContent = getLocalizedMessage('quickFilterDismissed');
    document.querySelector('#toggle-viewed-label').textContent = getLocalizedMessage('quickFilterViewed');
    document.querySelector('#show-icon-label').textContent = getLocalizedMessage('showButtonsToggle');
    document.getElementById('companies-label').textContent = getLocalizedMessage('companies');
}

function addTooltips() {
    document.getElementById('toggle-applied-label').title = getLocalizedMessage('quickFilterAppliedTooltip');
    document.getElementById('toggle-promoted-label').title = getLocalizedMessage('quickFilterPromotedTooltip');
    document.getElementById('toggle-dismissed-label').title = getLocalizedMessage('quickFilterDismissedTooltip');
    document.getElementById('toggle-viewed-label').title = getLocalizedMessage('quickFilterViewedTooltip');
    document.getElementById('show-icon-label').title = getLocalizedMessage('showButtonTooltip');
    //document.getElementById('toggle-show-buttons').title = getLocalizedMessage('showButtonTooltip');
}

// SINGLE DOMContentLoaded - All initialization
document.addEventListener('DOMContentLoaded', () => {
    // Hide company list initially
    document.getElementById('company-list').style.display = 'none';
    
    // Add click handler to company badge
    document.querySelector('.company-badge').addEventListener('click', toggleCompanies);
    
    // Initialize everything
    restoreCompanyList();
    restoreToggleStates();
    setLocalizedText();
    addTooltips();

    // Clear all button
    document.getElementById('clear-all-btn').addEventListener('click', clearAllCompanies);

    // Add company button
    document.getElementById('add-company-btn').addEventListener('click', () => {
        const input = document.getElementById('new-company');
        const companyName = input.value.trim();
        if (companyName) {
            addCompany(companyName);
            input.value = '';
        }
    });

    // Enter key in input
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

    // Version number
    const versionNumber = chrome.runtime.getManifest().version;
    if (versionNumber) document.getElementById('version-number').textContent = `v${versionNumber}`;
});
