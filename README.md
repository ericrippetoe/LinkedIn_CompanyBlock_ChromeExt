# 🔒 LinkedIn Job Blocker Chrome Extension

Tired of seeing the same companies or irrelevant job postings on LinkedIn?  
**LinkedIn Job Blocker** is a free, open-source Chrome extension that helps you **hide job listings based on company names, or status (such as Applied, Dismissed, etc.)** — so you can focus on the opportunities that actually matter to you.

Download the released version on the Chrome Web Store:
[https://chromewebstore.google.com/detail/linkedin-jobs-blocker/dgmclfgajjhlghegcieolpnnkjnnblmm](https://chromewebstore.google.com/detail/linkedin-jobs-blocker/dgmclfgajjhlghegcieolpnnkjnnblmm)

![screenshot](https://lh3.googleusercontent.com/LcGQqD851qUmRNdLEEunfxP1dD9pHmiRnjvMuGfElwGIxzBHlTJbSTuIPCqr7q80JI3G7HSXxiy2lDMybUdojWEIdw=s1280-w1280-h800)

---

## 📑 Table of Contents

- [Features](#-features)
- [Getting Started](#-getting-started)
- [How It Works](#-how-it-works)
- [Project Structure](#-project-structure)
- [Privacy](#-privacy)
- [Permissions](#-permissions)
- [Built With](#-built-with)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Reporting Issues](#-reporting-issues)
- [License](#-license)

---

## ✨ Features

- ✅ Block jobs by **company name** or **status**
- ✅ Automatically hides unwanted listings on LinkedIn Jobs
- ✅ Simple, intuitive **settings page**
- ✅ Stores all data locally using **Chrome's local storage**
- ✅ Lightweight, fast, and **privacy-focused**

---

## 🚀 Getting Started

### Installation from Chrome Web Store

Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/linkedin-jobs-blocker/dgmclfgajjhlghegcieolpnnkjnnblmm) and click **Add to Chrome**.

### Installation from Source (Development)

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
- If the company has been blocked or if you've set to hide a particular status (such as jobs that you've already Applied to), that job card is hidden.
- You manage your own block list via the dropdown or settings page.

---

## 🧰 Project Structure

```
├── manifest.json # Chrome Extension manifest file
├── content.js # Scans and hides job listings
├── popup.html / popup.js # Popup UI and logic
├── options.html / options.js # Settings/options page
├── popup.css # Popup styling
├── [language folders]/ # i18n translations (ar, de, en, es, fr, hi, it, ko, nl, pt, ru, zh)
│ └── messages.json # Localized strings
├── icons/ # Extension icons (icon16.png, icon48.png, icon128.png)
├── LICENSE # MIT License
├── README.md # This file
├── CONTRIBUTING.md # Contribution guidelines
├── CODE_OF_CONDUCT.md # Community guidelines
├── CHANGELOD.md # Change log
└── SECURITY.md # Security policy


```
---

## 🌍 Supported Languages

LinkedIn Job Blocker is available in multiple languages:
- 🇸🇦 Arabic (العربية)
- 🇩🇪 Deutsch
- 🇬🇧 English
- 🇪🇸 Español
- 🇫🇷 Français
- 🇮🇳 हिन्दी
- 🇮🇹 Italiano
- 🇰🇷 한국어
- 🇳🇱 Nederlands
- 🇵🇹 Português
- 🇷🇺 Русский
- 🇨🇳 中文

Help us translate to more languages! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 🛡️ Privacy

This extension runs **entirely in your browser**.  
No data is collected or sent to external servers.  
Your preferences are stored using Chrome's `local` storage, which is **encrypted** and stays on the local browser.

---

## 🔐 Permissions

This extension only requests access to LinkedIn Jobs pages to identify and hide job listings. No other data is accessed or collected.

---

## 🧱 Built With

- **JavaScript** (ES6+)
- **HTML5 & CSS3**
- **Chrome Extension APIs**
- **Chrome 88+** (minimum supported version)

---

## 🆘 Troubleshooting

### Extension not working?

- Make sure you're on [https://www.linkedin.com/jobs/](https://www.linkedin.com/jobs/)
- Try refreshing the page after blocking/unblocking companies
- Verify that the extension is enabled in `chrome://extensions/`
- Check your browser console for any error messages (F12 → Console tab)

### Settings not saving?

- Clear your browser cache and restart Chrome
- Reinstall the extension
- Check that you have enough local storage available

### Jobs still appearing after blocking?

- Make sure you're using the exact company name as it appears on LinkedIn
- The extension only works on the LinkedIn Jobs page, not in your feed
- Try refreshing the LinkedIn Jobs page

---

## 🙌 Contributing

Pull requests and issues are welcome! We'd love your help improving LinkedIn Job Blocker.

1. Fork the repo

2. Create your feature branch:  
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Commit your changes:  
   ```bash
   git commit -m 'Add your feature'
   ```

4. Push to the branch:  
   ```bash
   git push origin feature/your-feature-name
   ```

5. Open a pull request with a clear description of your changes

Please ensure your code is clean and well-commented!

---

## 🐛 Reporting Issues

Found a bug? Have a feature request? [Open an issue on GitHub](https://github.com/ericrippetoe/LinkedIn_CompanyBlock_ChromeExt/issues)

When reporting a bug, please include:
- What you were doing when the issue occurred
- What you expected to happen
- What actually happened
- Your Chrome version (chrome://version/)
- Steps to reproduce the issue

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

Made with ❤️ by [Eric Rippetoe](https://www.linkedin.com/in/ericrippetoe/)  
Helping job seekers take control of their LinkedIn experience.
