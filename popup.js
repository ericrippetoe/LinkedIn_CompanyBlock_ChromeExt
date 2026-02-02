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
    const companyBadge = document.getElementById('company-badge');
    const isExpanded = companyList.style.display !== 'none' && companyList.style.display !== '';

    if (!isExpanded) {
        companyList.style.display = 'flex';
        companyBadge.setAttribute('aria-expanded', 'true');
        companyBadge.style.background = 'var(--primary-dark)';
    } else {
        companyList.style.display = 'none';
        companyBadge.setAttribute('aria-expanded', 'false');
        companyBadge.style.background = 'var(--primary)';
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

// Toast notification helper with screen reader support
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
        <span class="icon" aria-hidden="true">${type === 'success' ? '✅' : '⚠️'}</span>
        ${message}
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Render company list from in-memory state (no storage read)
function renderCompanyList() {
    const companies = popupState.companies;

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
}

// Restore the company list from storage (initial load only)
function restoreCompanyList() {
    chrome.storage.local.get('companies', (data) => {
        const companies = data.companies || [];
        popupState.companies = companies; // Update in-memory state
        renderCompanyList();
    });
}

// Add new company
function addCompany(companyName) {
    const added = popupState.addCompany(companyName);
    if (added) {
        renderCompanyList();
        showToast(getLocalizedMessage('toastCompanyAdded', {company: companyName}), 'success');
    } else {
        showToast(getLocalizedMessage('toastCompanyExists', {company: companyName}), 'error');
    }
}

// Remove a company
function removeCompany(companyName) {
    const removed = popupState.removeCompany(companyName);
    if (removed) {
        renderCompanyList();
        showToast(getLocalizedMessage('toastCompanyRemoved', {company: companyName}), 'success');
    }
}

// Create a company list item (as li element for semantic HTML)
function createCompanyItem(companyName) {
    const li = document.createElement('li');
    li.className = 'company-item';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = companyName;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'X';
    removeBtn.setAttribute('aria-label', getLocalizedMessage('removeCompany') + ': ' + companyName);
    removeBtn.addEventListener('click', () => removeCompany(companyName));
    li.appendChild(nameSpan);
    li.appendChild(removeBtn);
    return li;
}

// Confirm and clear all companies
function clearAllCompanies() {
    if (confirm(getLocalizedMessage('clearConfirmation'))) {
        popupState.clearCompanies();
        renderCompanyList();
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
                const isChecked = data[toggleKey] ?? toggleKey === 'show-buttons';
                toggle.checked = isChecked;
                toggle.addEventListener('change', () => saveState(toggleKey, toggle.checked));

                // Update visual state for filter pills
                const filterPill = toggle.closest('.filter-pill');
                if (filterPill) {
                    if (isChecked) {
                        filterPill.classList.add('active');
                    } else {
                        filterPill.classList.remove('active');
                    }
                }
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
    // Set data-tooltip attributes for localization (not title to avoid duplicate tooltips)
    const elements = {
        appliedPill: document.querySelector('[data-filter="applied"]'),
        promotedPill: document.querySelector('[data-filter="promoted"]'),
        dismissedPill: document.querySelector('[data-filter="dismissed"]'),
        viewedPill: document.querySelector('[data-filter="viewed"]'),
        showButtonsPill: document.querySelector('[data-filter="show-buttons"]'),
        companyBadge: document.getElementById('company-badge')
    };

    if (elements.appliedPill) elements.appliedPill.setAttribute('data-tooltip', getLocalizedMessage('quickFilterAppliedTooltip'));
    if (elements.promotedPill) elements.promotedPill.setAttribute('data-tooltip', getLocalizedMessage('quickFilterPromotedTooltip'));
    if (elements.dismissedPill) elements.dismissedPill.setAttribute('data-tooltip', getLocalizedMessage('quickFilterDismissedTooltip'));
    if (elements.viewedPill) elements.viewedPill.setAttribute('data-tooltip', getLocalizedMessage('quickFilterViewedTooltip'));
    if (elements.showButtonsPill) elements.showButtonsPill.setAttribute('data-tooltip', getLocalizedMessage('showButtonTooltip'));
    if (elements.companyBadge) elements.companyBadge.setAttribute('data-tooltip', getLocalizedMessage('companies_tooltip'));
}

// Extracted function to handle adding a company (eliminates duplication)
function handleAddCompany() {
    const input = document.getElementById('new-company');
    const companyName = input.value.trim();
    if (companyName) {
        addCompany(companyName);
        input.value = '';
        input.focus();
    }
}

// SINGLE DOMContentLoaded - All initialization
document.addEventListener('DOMContentLoaded', () => {
    // Hide company list initially
    document.getElementById('company-list').style.display = 'none';

    // Add click and keyboard handlers to company badge
    const companyBadge = document.getElementById('company-badge');
    companyBadge.addEventListener('click', toggleCompanies);
    companyBadge.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleCompanies();
        }
    });

    // Initialize everything
    restoreCompanyList();
    restoreToggleStates();
    setLocalizedText();
    addTooltips();

    // Clear all button
    document.getElementById('clear-all-btn').addEventListener('click', clearAllCompanies);

    // Add company button - uses shared handler
    document.getElementById('add-company-btn').addEventListener('click', handleAddCompany);

    // Enter key in input - uses shared handler
    document.getElementById('new-company').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddCompany();
        }
    });

    // Filter pill click handlers - make entire pill clickable
    document.querySelectorAll('.filter-pill').forEach(pill => {
        const checkbox = pill.querySelector('input[type="checkbox"]');

        // Click on entire pill toggles the checkbox
        pill.addEventListener('click', (e) => {
            // Don't toggle if clicking on the checkbox itself
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                // Trigger change event to save state
                checkbox.dispatchEvent(new Event('change'));
            }
            // Update visual state
            updateFilterPillVisualState(pill, checkbox.checked);
        });

        // Update visual state when checkbox changes
        checkbox.addEventListener('change', () => {
            updateFilterPillVisualState(pill, checkbox.checked);
        });
    });

    // Function to update filter pill visual state
    function updateFilterPillVisualState(pill, isActive) {
        if (isActive) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    }

    // Version number
    const versionNumber = chrome.runtime.getManifest().version;
    if (versionNumber) document.getElementById('version-number').textContent = `v${versionNumber}`;
});
