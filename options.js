// Function to load locale messages
function getMessage(key) {
    return chrome.i18n.getMessage(key) || key; // Fallback to key if message not found
}

// Function to save the company names
function saveOptions() {
    // Use Set for O(1) uniqueness check instead of O(n²) Array.includes()
    const companyNames = [...new Set(
        document.getElementById('companyNames').value
            .split('\n') // Split by lines
            .map(name => name.trim()) // Remove extra spaces
            .filter(name => name) // Filter out empty lines
    )];

    chrome.storage.local.set({ companies: companyNames }, function () {
        if (chrome.runtime.lastError) {
            console.error(getMessage('errorSaving'), chrome.runtime.lastError);
        } else {
            const status = document.getElementById('status');
            status.textContent = getMessage('successClearAll'); // Display success message
            setTimeout(() => { status.textContent = ''; }, 3000); // Clear status after 3 seconds
        }
    });
}

// Function to clear all company names
function clearOptions() {
    if (confirm(getMessage('clearConfirmation'))) {
        chrome.storage.local.set({ companies: [] }, function () {
            const status = document.getElementById('status');
            status.textContent = getMessage('successClearAll');
            document.getElementById('companyNames').value = '';
            setTimeout(() => { status.textContent = ''; }, 3000);
        });
    }
}

// Function to restore options
function restoreOptions() {
    chrome.storage.local.get('companies', function (data) {
        if (data.companies && Array.isArray(data.companies)) {
            document.getElementById('companyNames').value = data.companies.join('\n');
        }
    });

    // Set localized text for UI elements
    document.getElementById('header-title').textContent = getMessage('headerTitle');
    document.title = getMessage('headerTitle');
    document.getElementById('companyNames').placeholder = getMessage('textareaPlaceholder');
    document.getElementById('save').textContent = getMessage('saveButton');
    document.getElementById('clear').textContent = getMessage('clearButton');
}

// Event listeners
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('clear').addEventListener('click', clearOptions);
document.addEventListener('DOMContentLoaded', restoreOptions);
