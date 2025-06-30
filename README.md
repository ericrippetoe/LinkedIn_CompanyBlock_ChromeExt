# 🔒 LinkedIn Job Blocker Chrome Extension

Tired of seeing the same companies or irrelevant job postings on LinkedIn?  
**LinkedIn Job Blocker** is a free, open-source Chrome extension that helps you **hide job listings based on company names, or status (such as Applied, Dismissed, etc.)** — so you can focus on the opportunities that actually matter to you.

Download the released version on the Chrome Web Store:
https://chromewebstore.google.com/detail/linkedin-jobs-blocker/dgmclfgajjhlghegcieolpnnkjnnblmm

![screenshot](https://lh3.googleusercontent.com/LcGQqD851qUmRNdLEEunfxP1dD9pHmiRnjvMuGfElwGIxzBHlTJbSTuIPCqr7q80JI3G7HSXxiy2lDMybUdojWEIdw=s1280-w1280-h800)

---

## ✨ Features

- ✅ Block jobs by **company name**, **job title**, or **custom keywords**
- ✅ Automatically hides or grays out unwanted listings on LinkedIn Jobs
- ✅ Simple, intuitive **settings page**
- ✅ Stores data using **Chrome sync storage** (encrypted, synced across devices)
- ✅ Lightweight, fast, and **privacy-focused**

---

## 🚀 Getting Started

1. Clone or download the repo:

   ```bash
   git clone https://github.com/ericrippetoe/LinkedIn_CompanyBlock_ChromeExt
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **Load unpacked** and select the folder where you cloned this repo

5. Go to [LinkedIn Jobs](https://www.linkedin.com/jobs/) and watch the unwanted jobs disappear ✨

---

## ⚙️ How It Works

- The extension scans all job cards on LinkedIn Jobs pages.
- If a job’s title or company matches any of your blocked keywords, it is hidden or visually muted.
- You manage your own block list via the settings page.

---

## 🧰 Project Structure

├── manifest.json         # Chrome Extension manifest file
├── content.js            # Scans and hides job listings based on keywords
├── options.html          # Settings page UI
├── options.js            # Logic for managing and saving user preferences
├── styles.css            # Basic styling for the options page
└── README.md             # This file


---

## 🖥️ Settings Page Features

- Add and remove keywords easily
- Save button is **disabled** until you make a change
- Saves to `chrome.storage.sync`
- Updates job listings when saved

---

## 🛡️ Privacy

This extension runs **entirely in your browser**.  
No data is collected or sent to external servers.  
Your preferences are stored using Chrome's `sync` storage, which is **encrypted** and synced across devices that use your Google account.

---

## 🧱 Built With

- JavaScript
- HTML & CSS
- Chrome Extension APIs

---

## 🙌 Contributing

Pull requests and issues are welcome!

1. Fork the repo

2. Create your feature branch:  
   `git checkout -b feature/your-feature-name`

3. Commit your changes:  
   `git commit -m 'Add your feature'`

4. Push to the branch:  
   `git push origin feature/your-feature-name`

5. Open a pull request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

Made with ❤️ by [Eric Rippetoe](https://www.linkedin.com/in/ericrippetoe/)  
Helping job seekers take control of their LinkedIn experience.
