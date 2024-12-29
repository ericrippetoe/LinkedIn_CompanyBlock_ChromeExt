// Function to save the company names when the "Save" button is clicked
function saveOptions() {
    var companyNames = document.getElementById('companyNames').value;
    var companiesArray = companyNames.split('\n').map(name => name.trim()).filter(name => name.length > 0);
    chrome.storage.local.set({'companies': companiesArray}, function() {
        if (chrome.runtime.lastError) {
            console.error("Error saving companies:", chrome.runtime.lastError);
        } else {
            console.log('Company names saved:', companiesArray);
        }
    });
}

// Function to load saved company names when the options page is loaded
function restoreOptions() {
    chrome.storage.local.get('companies', function(data) {
        if (data.companies) {
            document.getElementById('companyNames').value = data.companies.join('\n');
        }
    });
}

// Event listener for the save button
document.getElementById('save').addEventListener('click', saveOptions);

// Load existing settings on document load
document.addEventListener('DOMContentLoaded', restoreOptions);
