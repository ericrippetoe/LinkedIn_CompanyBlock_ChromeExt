# Contributing to LinkedIn Job Blocker

Thank you for your interest in contributing to LinkedIn Job Blocker! We're excited to have you help make this extension even better. This document provides guidelines and instructions for contributing.

## 🎯 Ways You Can Contribute

- **Report bugs** – Found something broken? Let us know!
- **Suggest features** – Have an idea to improve the extension? Share it!
- **Improve documentation** – Help clarify our README, guides, or code comments
- **Fix bugs** – Submit pull requests to resolve issues
- **Add features** – Implement new functionality or improvements
- **Share feedback** – Test the extension and provide your thoughts

## 🐛 Reporting Bugs

Before reporting a bug, please check if it's already been reported by searching [existing issues](https://github.com/ericrippetoe/LinkedIn_CompanyBlock_ChromeExt/issues).

When you create a bug report, include:
- **Title** – Clear, concise description of the bug
- **Description** – What were you doing when the bug occurred?
- **Expected behavior** – What should have happened?
- **Actual behavior** – What actually happened?
- **Steps to reproduce** – How can we reproduce the issue?
- **Screenshots** – If applicable, include screenshots
- **Environment** – Your Chrome version (check `chrome://version/`), OS, etc.

## 💡 Suggesting Features

Have an idea? We'd love to hear it! Before suggesting, please check [existing issues](https://github.com/ericrippetoe/LinkedIn_CompanyBlock_ChromeExt/issues) to avoid duplicates.

When suggesting a feature, explain:
- **The problem** – What issue does this solve?
- **Your solution** – How would the feature work?
- **Why it's important** – Why should we implement this?
- **Alternative solutions** – Are there other ways to solve this?

## 🔧 Setting Up for Development

### Prerequisites
- Chrome browser (version 88 or later)
- A code editor (VS Code recommended)
- Git and GitHub account

### Local Setup

1. **Fork the repository** – Click the "Fork" button on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/LinkedIn_CompanyBlock_ChromeExt.git
   cd LinkedIn_CompanyBlock_ChromeExt
   ```

3. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Load the extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked" and select your local folder
   - The extension will now appear in your Chrome extensions

5. **Make your changes** – Edit files as needed

6. **Test thoroughly:**
   - Test on the LinkedIn Jobs page
   - Try different scenarios and edge cases
   - Check the browser console for errors (F12 → Console)
   - Reload the extension in Chrome after each change (click the reload icon in `chrome://extensions/`)

## 💻 Code Style & Standards

To keep the codebase clean and consistent:

- **Use meaningful variable names** – `blockedCompanies` instead of `bc`
- **Add comments** – Explain complex logic or non-obvious decisions
- **Keep functions focused** – One function should do one thing
- **Follow existing patterns** – Match the style of existing code
- **Test your code** – Make sure it works before submitting
- **No console.log spam** – Remove or use only for debugging (and note it in PRs)

### JavaScript Standards
- Use ES6+ features (const/let, arrow functions, etc.)
- Avoid using `var`
- Use semicolons consistently
- Add comments for non-obvious code

### HTML & CSS Standards
- Use semantic HTML5 elements
- Keep CSS organized and commented
- Avoid inline styles when possible
- Use meaningful class names

## 📝 Committing Changes

Write clear, descriptive commit messages:

**Good:**
```
git commit -m "Add feature to hide jobs by status"
git commit -m "Fix bug where blocked companies reappear on refresh"
git commit -m "Update documentation for new feature"
```

**Bad:**
```
git commit -m "fix stuff"
git commit -m "updates"
git commit -m "asdf"
```

## 🔄 Submitting a Pull Request

1. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request on GitHub:**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template with:
     - **Title** – Clear description of changes
     - **Description** – What does this PR do? Why?
     - **Type of change** – Bug fix / Feature / Documentation update
     - **Testing** – How did you test this?
     - **Screenshots** – If applicable

3. **Be responsive:**
   - Watch for feedback and comments
   - Be open to suggestions
   - Make requested changes promptly
   - Don't be discouraged by critiques – they help improve code quality!

4. **PR will be merged** – Once approved, maintainers will merge it in

## ✅ PR Review Checklist

Before submitting a PR, make sure:
- ✅ Your code follows the style guidelines
- ✅ You've tested the changes thoroughly
- ✅ New features are documented
- ✅ No sensitive data (keys, tokens) is included
- ✅ Commit messages are clear and descriptive
- ✅ No console.log statements (unless noted)
- ✅ Changes are focused on a single feature/fix

## 📖 Documentation

If you improve documentation:
- Use clear, simple language
- Include examples when helpful
- Keep the README up to date
- Add comments to complex code sections

## 🤝 Community Guidelines

- **Be respectful** – Treat others with kindness
- **Be constructive** – Provide helpful feedback
- **Be patient** – Maintainers are volunteers
- **Be clear** – Communicate your ideas plainly
- **Ask questions** – Don't be afraid to ask for clarification

## ❓ Questions?

- Check the [README.md](README.md) first
- Search [existing issues and discussions](https://github.com/ericrippetoe/LinkedIn_CompanyBlock_ChromeExt/issues)
- Open a new issue if you can't find an answer

## 📋 License

By contributing to LinkedIn Job Blocker, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

Thank you for contributing! We appreciate your help making LinkedIn Job Blocker better for everyone. ❤️
