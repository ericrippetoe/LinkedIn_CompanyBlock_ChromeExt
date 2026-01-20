# Changelog

All notable changes to LinkedIn Job Blocker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.1] - 2026-01-20

### Fixed

- 🐛 **Duplicate Tooltips** – Changed `title` attribute to `data-tooltip` to prevent both CSS and native browser tooltips from showing simultaneously on filter pills and company badge

---

## [2.2.0] - 2026-01-20

### 🚀 Performance & Design Overhaul

Major performance improvements and complete UI redesign for a faster, cleaner experience.

### Added

- 📊 **Performance Analysis Report** – Comprehensive analysis identifying 13 performance issues
- 🎨 **Design Mockups** – Three interactive design options for user testing
- ⚡ **Batched Storage Operations** – New `PopupState` class for efficient storage writes
- 📦 **DocumentFragment DOM Updates** – Single reflow rendering for company lists

### Changed

- 🎨 **Redesigned Popup Interface**
  - Pill-style filter buttons in 2x2 grid layout
  - Compact 500px height (down from 600px)
  - LinkedIn blue gradient for active states (#0073b1)
  - Full-width "Display Block Icon" toggle
  - Modern system font stack (Segoe UI)
  - Icon and text inline in each pill

- ⚡ **Performance Optimizations** (10-20x faster)
  - Replaced `Array.includes()` with `Set.has()` for O(1) company lookups
  - Eliminated duplicate `querySelectorAll()` calls
  - Pre-compiled regex patterns in constructor
  - Cached DOM query results in loops
  - Batch storage initialization (single write vs multiple)
  - Increased company list max-height: 150px → 200px

- 🧹 **Code Quality**
  - Gated console.log behind debug flag (disabled in production)
  - Data-attribute tracking prevents button re-creation
  - Cached element references in localization
  - Optimized string replacement with `replaceAll()`

### Fixed

- 🐛 **Options Page Locale** – Added missing `clearButton` translation key
- 🐛 **Footer Reference Error** – Removed non-existent footer element reference in options.js
- 🔧 **Visual State Sync** – Filter pills properly sync with checkbox state

### Performance Metrics

**Before:**
- 500 jobs + 100 companies = ~2000ms
- Popup with 100 companies = ~50ms

**After:**
- 500 jobs + 100 companies = ~100ms (20x faster)
- Popup with 100 companies = ~10ms (5x faster)

### Technical Details

**Complexity Improvements:**
- Company filtering: O(n²) → O(n)
- Uniqueness checks: O(n²) → O(n)
- DOM queries: 2 calls → 1 call
- Regex compilation: Per iteration → One time
- Storage operations: 3 per action → 1 batched

---

## [2.0.0] - 2025-12-06

### 🎉 First Open Source Release!

This is the official open-source release of LinkedIn Job Blocker. The extension is now available for community contributions and collaboration.

### Added

- 🌍 **Multilingual Support** – Available in 12+ languages:
  - Arabic (العربية)
  - German (Deutsch)
  - English
  - Spanish (Español)
  - French (Français)
  - Hindi (हिन्दी)
  - Italian (Italiano)
  - Korean (한국어)
  - Dutch (Nederlands)
  - Portuguese (Português)
  - Russian (Русский)
  - Chinese (中文)

- 📚 **Comprehensive Documentation**
  - Enhanced README with getting started guide
  - CONTRIBUTING.md with development setup
  - CODE_OF_CONDUCT.md for community standards
  - SECURITY.md for vulnerability reporting
  - This CHANGELOG

- 🔒 **Security & Privacy**
  - Open-source code for transparency
  - Security policy for responsible disclosure
  - Clear privacy documentation

### Features

- ✅ Block jobs by company name
- ✅ Hide job postings by status (Applied, Dismissed, etc.)
- ✅ Intuitive settings page
- ✅ Local data storage with Chrome encryption
- ✅ Lightweight and privacy-focused
- ✅ Works exclusively on LinkedIn Jobs pages

### Known Issues

- None reported yet! Please [open an issue](https://github.com/ericrippetoe/LinkedIn_CompanyBlock_ChromeExt/issues) if you find any.

### Coming Soon

- Dark mode theme option
- Export/import blocklist settings
- Advanced filtering options
- Community-contributed translations

---

## How to Update

If you installed version 1.x from the Chrome Web Store:

1. Open `chrome://extensions/`
2. Click the refresh/reload icon on LinkedIn Job Blocker
3. Or uninstall and reinstall from the [Chrome Web Store](https://chromewebstore.google.com/detail/linkedin-jobs-blocker/dgmclfgajjhlghegcieolpnnkjnnblmm)

---

## Version History

### v1.x (Pre-Release)

Internal releases before open sourcing. See [GitHub releases](https://github.com/ericrippetoe/LinkedIn_CompanyBlock_ChromeExt/releases) for details.

---

## Contributing to the Changelog

When submitting a pull request, please update this CHANGELOG.md following the format above. Categorize changes as:

- **Added** – New features
- **Changed** – Changes to existing functionality
- **Deprecated** – Soon-to-be removed features
- **Removed** – Removed features
- **Fixed** – Bug fixes
- **Security** – Security updates

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## Questions?

Have questions about a specific version? [Open a discussion](https://github.com/ericrippetoe/LinkedIn_CompanyBlock_ChromeExt/discussions) on GitHub!
