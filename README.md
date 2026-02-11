```
# 🔍 KrySearch

[![LibreJS Compatible](https://img.shields.io/badge/LibreJS-OK-success?style=flat)](https://www.gnu.org/software/librejs/)  
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)  
[![GitHub stars](https://img.shields.io/github/stars/Bloodware-Inc/KrySearch?style=social)](https://github.com/Bloodware-Inc/KrySearch/stargazers)  

**KrySearch** is a **privacy-first, open-source search router** by **Krynet, LLC**.  
Route your searches through multiple engines **without logging or storing personal data**, fully **GPL 3.0 licensed**.  

Search privately, avoid ads, and choose engines for ultimate online privacy control.  

---

## ⚡ Features

| Feature | Description |
|---------|-------------|
| ✅ LibreJS Compatible | Fully compatible with LibreJS |
| 🟢 Free Software | GPL-3.0-or-later, self-hosted JS |
| 🔒 Privacy-Focused | No data collection or tracking |
| 🌐 Open Source | Transparent and auditable |
| 🚫 No Tracking | No ads or profiling |
| 🔐 Encrypted | All queries over HTTPS |
| 🔀 Multiple Engines | Open-source & closed-source options |
| 🍪 No Cookies | Full anonymity |
| 🧱 CSP & CORS Safe | Works on GitHub Pages and strict policies |
| 🛡️ No Ads/Personalization | No ads, no tracking |
| 🔑 Encrypted Relay | Hybrid post-quantum + classical crypto |
| ⚡ Search Isolation | Prevent leaks |
| 🗝️ Zero-Knowledge | Queries never stored or logged |
| 🔒 HTTPS-only enforcement | For ?url= redirects |
| 🛡️ CSP & XSS Safe | Works on strict pages |

---

## 🔧 How It Works

**KrySearch** acts as a **search router**:

1. **User Input** – enter a query or URL  
2. **Search Routing** – safely routed to the selected engine  
3. **Return Results** – results come directly from the engine, no tracking

---

## 🚀 Installation

### Prerequisites

- Modern browser (Chrome, Firefox, Edge, Safari)  
- Basic knowledge of deploying web projects  

### Steps

```bash
# Clone repository
git clone https://github.com/Bloodware-Inc/KrySearch.git

# Enter project folder
cd KrySearch

# Open index.html in your browser or deploy to a server
```

### 📦 GitHub Pages Deployment

1. Push code to your GitHub repo  
2. Go to **Settings → Pages**  
3. Set source branch (**main** or **gh-pages**)  
4. Save → your KrySearch instance is live  

---

## 📝 Usage

| Action | Description |
|--------|-------------|
| 🔍 Search | Enter queries or URLs |
| ⚙️ Select Engine | Pick preferred engine from dropdown |
| 🕵️ Privacy Mode | All queries are private |

### Query Parameters

| Parameter | Use |
|-----------|-----|
| `?q=<query>` | Search query |
| `?url=<url>` | Direct URL |

**Example URLs:**

```
https://yourdomain.com/?q=privacy
https://yourdomain.com/?url=https://example.com
```

---

## 🛡️ Privacy & Security

- **No Data Collection** – queries never logged  
- **No Cookies** – full anonymity  
- **Secure Connections** – HTTPS enforced  
- **No Personalization** – no tracking, no ads  
- **Zero-Knowledge** – queries never stored  
- **Encrypted Relay** – hybrid post-quantum + classical crypto  
- **CSP & XSS Safe** – works on strict pages  

---

## 🤝 Contributing

We welcome contributions!  

1. Fork the repo  
2. Clone your fork:  
```bash
git clone https://github.com/YOUR_USERNAME/KrySearch.git
```
3. Create a branch:  
```bash
git checkout -b feature-branch
```
4. Make changes & test  
5. Commit & push:  
```bash
git commit -am "Add feature or fix bug"
git push origin feature-branch
```
6. Open a pull request  

**Ideas:** add engines, privacy features, UI improvements, better error handling

---

## ⚙️ Extending KrySearch

<details>
<summary>Adding a New Search Engine</summary>

Edit `search.js` and extend the `CONFIG` object:

```javascript
const engines = { 
  ...CONFIG.engines.open_source, 
  ...CONFIG.engines.closed_source,
  'new-engine': {
    name: 'New Engine',
    base: 'https://newengine.com/search?q=',
    mode: 'query'
  }
};
```
</details>

<details>
<summary>Customizing the UI</summary>

Modify HTML/CSS for theme, layout, or branding changes.
</details>

<details>
<summary>Using Plugins</summary>

```javascript
window.KRY_PLUGINS.push({
  id: 'new-feature',
  description: 'Adds new feature to KrySearch',
  run() {
    // Your custom logic
  }
});
```
> ⚠️ Always follow privacy & security best practices
</details>

---

## 🏢 About Krynet, LLC

Krynet, LLC is a **privacy-first tech company** building secure, transparent tools.  
KrySearch is part of the Krynet ecosystem for secure, privacy-respecting alternatives to traditional web services.

- 🌐 Website: [https://krynet.ai](https://krynet.ai)  
- ✉️ Email: contact@krynet.ai  

---

## 🔑 License

KrySearch is licensed under **GNU GPL v3**: [https://www.gnu.org/licenses/gpl-3.0](https://www.gnu.org/licenses/gpl-3.0)
```
