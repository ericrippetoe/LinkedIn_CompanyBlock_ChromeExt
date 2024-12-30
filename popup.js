console.log("Current locale:", chrome.i18n.getUILanguage());
console.log("Localized text for headerTitle:", chrome.i18n.getMessage("headerTitle"));


// Function to load locale messages
function getMessage(key) {
    return chrome.i18n.getMessage(key) || key; // Fallback to key if message not found
}

// Function to save the company names when the "Save" button is clicked
function saveOptions() {
    const companyNames = document.getElementById('companyNames').value
        .split('\n') // Split by lines
        .map(name => name.trim()) // Trim each line to remove extra spaces
        .filter(name => name) // Filter out empty lines or lines with just spaces
        .reduce((unique, item) => {
            // Ensure only unique names are added
            if (!unique.includes(item)) unique.push(item);
            return unique;
        }, []); // Start with an empty array for unique names

    chrome.storage.local.set({ companies: companyNames }, function () {
        if (chrome.runtime.lastError) {
            console.error(getMessage('errorSaving'), chrome.runtime.lastError);
        } else {
            console.log(getMessage('successAddedCompany'), companyNames);
            // Show a brief message to the user with countdown
            const status = document.getElementById('status');
            let countdown = 3;
            status.textContent = getMessage('statusSaved').replace('{count}', countdown);

            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    status.textContent = getMessage('statusSaved').replace('{count}', countdown);
                } else {
                    clearInterval(countdownInterval);
                    window.close(); // Close the popup
                }
            }, 1000); // Update every second
        }
    });
}

// Function to load saved company names when the popup is loaded
function restoreOptions() {
    chrome.storage.local.get('companies', function (data) {
        if (data.companies && Array.isArray(data.companies)) {
            document.getElementById('companyNames').value = data.companies.join('\n');
        }
    });
}

// Function to clear all saved companies
function clearOptions() {
    if (confirm(getMessage('clearConfirmation'))) {
        chrome.storage.local.set({ companies: [] }, function () {
            const status = document.getElementById('status');
            status.textContent = getMessage('successClearAll');
            document.getElementById('companyNames').value = ''; // Clear the textarea
        });
    }
}

// Event listener for the save button
document.getElementById('save').addEventListener('click', saveOptions);

// Event listener for the clear button
document.getElementById('clear').addEventListener('click', clearOptions);

// Load existing settings and localized text on document load
document.addEventListener('DOMContentLoaded', restoreOptions);

document.addEventListener('DOMContentLoaded', () => {
    // Set localized text for UI elements
    document.getElementById('header-title').textContent = chrome.i18n.getMessage('headerTitle');
    document.getElementById('companyNames').placeholder = chrome.i18n.getMessage('textareaPlaceholder');
    document.getElementById('save').textContent = chrome.i18n.getMessage('saveButton');
    document.getElementById('clear').textContent = chrome.i18n.getMessage('clearButton');
    document.getElementById('donate-button').textContent = chrome.i18n.getMessage('donateText');
    document.getElementById('footer-text').innerHTML = chrome.i18n.getMessage('footerText');
});
