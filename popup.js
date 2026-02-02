// ============================================================================
// Constants
// ============================================================================
const TIMING = {
    BATCH_DELAY: 100,        // ms - delay before batched storage write
    TOAST_SHOW_DELAY: 100,   // ms - delay before toast animation starts
    TOAST_DISPLAY: 3000,     // ms - how long toast stays visible
    TOAST_FADE_OUT: 400      // ms - toast fade out animation duration
};

// ============================================================================
// Storage Helpers (Promise-based)
// ============================================================================
function storageGet(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, (data) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data);
            }
        });
    });
}

function storageSet(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(data, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

// ============================================================================
// In-memory state manager for batched storage operations
// ============================================================================
class PopupState {
    constructor() {
        this.companies = [];
        this.pendingWrite = null;
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
        this.pendingWrite = setTimeout(async () => {
            try {
                await storageSet({ companies: this.companies });
            } catch (error) {
                console.error('Error saving state:', error);
                showToast(getLocalizedMessage('errorSaving'), 'error');
            }
        }, TIMING.BATCH_DELAY);
    }
}

const popupState = new PopupState();

// ============================================================================
// Helper function to save state (with error feedback)
// ============================================================================
async function saveState(key, value) {
    try {
        await storageSet({ [key]: value });
    } catch (error) {
        console.error('Error saving state:', error);
        showToast(getLocalizedMessage('errorSaving'), 'error');
    }
}

// ============================================================================
// UI Functions
// ============================================================================
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
    Object.entries(params).forEach(([paramKey, value]) => {
        message = message.replaceAll(`{${paramKey}}`, value);
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

    setTimeout(() => toast.classList.add('show'), TIMING.TOAST_SHOW_DELAY);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), TIMING.TOAST_FADE_OUT);
    }, TIMING.TOAST_DISPLAY);
}

// ============================================================================
// Company List Management
// ============================================================================

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
async function restoreCompanyList() {
    try {
        const data = await storageGet('companies');
        const companies = data.companies || [];
        popupState.companies = companies;
        renderCompanyList();
    } catch (error) {
        console.error('Error loading companies:', error);
        showToast(getLocalizedMessage('errorLoading'), 'error');
    }
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

// ============================================================================
// Toggle States
// ============================================================================

// Restore toggle states
async function restoreToggleStates() {
    const toggleKeys = ['applied', 'promoted', 'dismissed', 'viewed', 'show-buttons'];

    try {
        const data = await storageGet(toggleKeys);

        // Batch initialization - collect all undefined values
        const updates = {};
        if (data['show-buttons'] === undefined) {
            updates['show-buttons'] = true;
        }

        // Single write if needed
        if (Object.keys(updates).length > 0) {
            await storageSet(updates);
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
    } catch (error) {
        console.error('Error restoring toggle states:', error);
        showToast(getLocalizedMessage('errorLoading'), 'error');
    }
}

// ============================================================================
// Localization
// ============================================================================

// Set localized UI text
function setLocalizedText() {
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

// ============================================================================
// Event Handlers
// ============================================================================

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

// Function to update filter pill visual state
function updateFilterPillVisualState(pill, isActive) {
    if (isActive) {
        pill.classList.add('active');
    } else {
        pill.classList.remove('active');
    }
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
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

    // Initialize everything (async operations run in parallel)
    await Promise.all([
        restoreCompanyList(),
        restoreToggleStates()
    ]);

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

    // Version number
    const versionNumber = chrome.runtime.getManifest().version;
    if (versionNumber) document.getElementById('version-number').textContent = `v${versionNumber}`;
});
