// In-memory state manager for batched storage operations
class PopupState {
    constructor() {
        this.companies = [];
        this.pendingWrite = null;
        this.batchDelay = 100; // ms
    }

    setCompanies(companies) {
        this.companies = companies;
        this.scheduleSave();
    }

    addCompany(name) {
        if (!this.companies.includes(name)) {
            this.companies.push(name);
            this.scheduleSave();
            return true;
        }
        return false;
    }

    removeCompany(name) {
        const index = this.companies.indexOf(name);
        if (index !== -1) {
            this.companies.splice(index, 1);
            this.scheduleSave();
            return true;
        }
        return false;
    }

    clearCompanies() {
        this.companies = [];
        this.scheduleSave();
    }

    scheduleSave() {
        clearTimeout(this.pendingWrite);
        this.pendingWrite = setTimeout(() => {
            chrome.storage.local.set({ companies: this.companies }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error saving state:', chrome.runtime.lastError);
                }
            });
        }, this.batchDelay);
    }
}

const popupState = new PopupState();

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
    // Use replaceAll instead of creating new RegExp objects in loop
    Object.entries(params).forEach(([key, value]) => {
        message = message.replaceAll(`{${key}}`, value);
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
        popupState.companies = companies; // Update in-memory state

        const companyCount = document.getElementById('company-count');
        const companyCountBadge = document.getElementById('company-count-badge');

        if (companyCount) companyCount.textContent = `${companies.length}`;
        if (companyCountBadge) companyCountBadge.textContent = `${companies.length}`;

        const companyList = document.getElementById('company-list');
        companyList.innerHTML = '';

        // Use DocumentFragment for batch DOM updates - single reflow
        const fragment = document.createDocumentFragment();
        companies.forEach((company) => {
            const item = createCompanyItem(company);
            fragment.appendChild(item);
        });
        companyList.appendChild(fragment);
    });
}

// Add new company
function addCompany(companyName) {
    const added = popupState.addCompany(companyName);
    if (added) {
        restoreCompanyList();
        showToast(getLocalizedMessage('toastCompanyAdded', {company: companyName}), 'success');
    } else {
        showToast(getLocalizedMessage('toastCompanyExists', {company: companyName}), 'error');
    }
}

// Remove a company
function removeCompany(companyName) {
    const removed = popupState.removeCompany(companyName);
    if (removed) {
        restoreCompanyList();
        showToast(getLocalizedMessage('toastCompanyRemoved', {company: companyName}), 'success');
    }
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
        popupState.clearCompanies();
        restoreCompanyList();
        showToast(getLocalizedMessage('toastAllCleared'), 'success');
    }
}

// Restore toggle states
function restoreToggleStates() {
    const toggleKeys = ['applied', 'promoted', 'dismissed', 'viewed', 'show-buttons'];
    chrome.storage.local.get(toggleKeys, (data) => {
        // Batch initialization - collect all undefined values
        const updates = {};
        if (data['show-buttons'] === undefined) {
            updates['show-buttons'] = true;
        }

        // Single write if needed
        if (Object.keys(updates).length > 0) {
            chrome.storage.local.set(updates);
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
    // Cache element references for better performance
    const elements = {
        headerTitle: document.getElementById('header-title'),
        addBtn: document.getElementById('add-company-btn'),
        clearBtn: document.getElementById('clear-all-btn'),
        newCompany: document.getElementById('new-company'),
        footerText: document.getElementById('footer-text'),
        quickFiltersTitle: document.querySelector('#quick-filters-title'),
        toggleAppliedLabel: document.querySelector('#toggle-applied-label'),
        togglePromotedLabel: document.querySelector('#toggle-promoted-label'),
        toggleDismissedLabel: document.querySelector('#toggle-dismissed-label'),
        toggleViewedLabel: document.querySelector('#toggle-viewed-label'),
        showIconLabel: document.querySelector('#show-icon-label'),
        companiesLabel: document.getElementById('companies-label')
    };

    elements.headerTitle.textContent = getLocalizedMessage('headerTitle');
    elements.addBtn.textContent = getLocalizedMessage('addButton');
    elements.clearBtn.textContent = getLocalizedMessage('clearAllButton');
    elements.newCompany.placeholder = getLocalizedMessage('addCompanyPlaceholder');
    elements.footerText.innerHTML = getLocalizedMessage('footerText');
    elements.quickFiltersTitle.textContent = getLocalizedMessage('quickFiltersTitle');
    elements.toggleAppliedLabel.textContent = getLocalizedMessage('quickFilterApplied');
    elements.togglePromotedLabel.textContent = getLocalizedMessage('quickFilterPromoted');
    elements.toggleDismissedLabel.textContent = getLocalizedMessage('quickFilterDismissed');
    elements.toggleViewedLabel.textContent = getLocalizedMessage('quickFilterViewed');
    elements.showIconLabel.textContent = getLocalizedMessage('showButtonsToggle');
    elements.companiesLabel.textContent = getLocalizedMessage('companies');
}

function addTooltips() {
    // Cache element references for better performance
    const elements = {
        toggleAppliedLabel: document.getElementById('toggle-applied-label'),
        togglePromotedLabel: document.getElementById('toggle-promoted-label'),
        toggleDismissedLabel: document.getElementById('toggle-dismissed-label'),
        toggleViewedLabel: document.getElementById('toggle-viewed-label'),
        showIconLabel: document.getElementById('show-icon-label')
    };

    elements.toggleAppliedLabel.title = getLocalizedMessage('quickFilterAppliedTooltip');
    elements.togglePromotedLabel.title = getLocalizedMessage('quickFilterPromotedTooltip');
    elements.toggleDismissedLabel.title = getLocalizedMessage('quickFilterDismissedTooltip');
    elements.toggleViewedLabel.title = getLocalizedMessage('quickFilterViewedTooltip');
    elements.showIconLabel.title = getLocalizedMessage('showButtonTooltip');
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
