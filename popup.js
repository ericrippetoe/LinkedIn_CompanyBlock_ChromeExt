// Function to save the company names when the "Save" button is clicked
function saveOptions() {
    const companyNames = document.getElementById('companyNames').value
        .split('\n') // Split by lines
        .map(name => name.trim()) // Trim each line to remove extra spaces
        .filter(name => name); // Filter out empty lines or lines with just spaces

    chrome.storage.local.set({ companies: companyNames }, function () {
        if (chrome.runtime.lastError) {
            console.error("Error saving companies:", chrome.runtime.lastError);
        } else {
            console.log('Company names saved:', companyNames);
            // Show a brief message to the user
            const status = document.getElementById('status');
            status.textContent = 'Saved! Closing...';
            setTimeout(() => {
                window.close(); // Close the popup
            }, 1500); // Delay to let user see the message
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

// Event listener for the save button
document.getElementById('save').addEventListener('click', saveOptions);

// Load existing settings on document load
document.addEventListener('DOMContentLoaded', restoreOptions);

document.addEventListener("DOMContentLoaded", function () {
    const bmcContainer = document.getElementById("bmc-container");

    const bmcButton = document.createElement("a");
    bmcButton.setAttribute("href", "https://buymeacoffee.com/ericrippetoe");
    bmcButton.setAttribute("target", "_blank");
    bmcButton.setAttribute("style", `
        display: inline-block;
        padding: 10px 25px;
        font-size: 16px;
        font-family: Lato, sans-serif;
        color: #ffffff;
        background-color: #5F7FFF;
        text-decoration: none;
        border-radius: 5px;
    `);
    bmcButton.innerHTML = "Buy me a coffee";

    bmcContainer.appendChild(bmcButton);
});
