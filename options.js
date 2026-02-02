// ============================================================================
// Constants
// ============================================================================
const TIMING = {
    STATUS_DISPLAY: 3000  // ms - how long status message stays visible
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
// Localization Helper
// ============================================================================
function getMessage(key) {
    return chrome.i18n.getMessage(key) || key;
}

// ============================================================================
// Options Functions
// ============================================================================

async function saveOptions() {
    const companyNames = [...new Set(
        document.getElementById('companyNames').value
            .split('\n')
            .map(name => name.trim())
            .filter(name => name)
    )];

    const status = document.getElementById('status');

    try {
        await storageSet({ companies: companyNames });
        status.textContent = getMessage('successSave');
        status.style.color = 'green';
        setTimeout(() => { status.textContent = ''; }, TIMING.STATUS_DISPLAY);
    } catch (error) {
        console.error(getMessage('errorSaving'), error);
        status.textContent = getMessage('errorSaving');
        status.style.color = 'red';
        setTimeout(() => { status.textContent = ''; }, TIMING.STATUS_DISPLAY);
    }
}

async function clearOptions() {
    if (confirm(getMessage('clearConfirmation'))) {
        const status = document.getElementById('status');

        try {
            await storageSet({ companies: [] });
            status.textContent = getMessage('successClearAll');
            status.style.color = 'green';
            document.getElementById('companyNames').value = '';
            setTimeout(() => { status.textContent = ''; }, TIMING.STATUS_DISPLAY);
        } catch (error) {
            console.error(getMessage('errorSaving'), error);
            status.textContent = getMessage('errorSaving');
            status.style.color = 'red';
            setTimeout(() => { status.textContent = ''; }, TIMING.STATUS_DISPLAY);
        }
    }
}

async function restoreOptions() {
    try {
        const data = await storageGet('companies');
        if (data.companies && Array.isArray(data.companies)) {
            document.getElementById('companyNames').value = data.companies.join('\n');
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }

    // Set localized text for UI elements
    document.getElementById('header-title').textContent = getMessage('headerTitle');
    document.title = getMessage('headerTitle');
    document.getElementById('companyNames').placeholder = getMessage('textareaPlaceholder');
    document.getElementById('save').textContent = getMessage('saveButton');
    document.getElementById('clear').textContent = getMessage('clearButton');
}

// ============================================================================
// Event Listeners
// ============================================================================
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('clear').addEventListener('click', clearOptions);
document.addEventListener('DOMContentLoaded', restoreOptions);
