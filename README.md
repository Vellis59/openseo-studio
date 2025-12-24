# OpenSEO Studio

OpenSEO Studio is a **fully client-side, static SEO writing tool** powered by AI models through [OpenRouter](https://openrouter.ai/).

No backend. No database. Bring Your Own API Key (BYOK).  
Your API key stays in your browser — you keep full control.

This repository contains **OpenSEO Studio v0.9.4**, including split-screen editing, light/dark theme controls, offline-ready PWA support, refreshed mobile UX, multilingual SEO output, client-side persistence & security controls, and export-ready actions.

---

## Features (v0.9.4)

### 🧩 Core Functionality
- 100% client-side, static HTML/CSS/JS
- SEO-optimized long-form article generation
- Markdown-only output (no HTML, no front matter, no emojis)
- Supports a curated list of 20+ output languages with strict single-language prompts

### 🔧 AI Model Selection (Dynamic via OpenRouter)

OpenSEO Studio no longer uses a fixed list of AI models.

When you enter your OpenRouter API key, the app automatically fetches all models available on your account (including premium, BYOK and new models), and updates the selector in real time.

✔ Always up to date
✔ No hard-coded list
✔ Models depend on your API key

(The model list is dynamically loaded — it may differ for each user)

### ✨ New in v0.9.4
- **Export entry point** next to Copy Markdown (Download .md + CMS placeholders).
- **Download .md** export with readable, dated filenames.
- **Ghost + WordPress placeholders** with required fields listed for future integration.
- **UI**: fix light mode contrast

### ✅ Previously in v0.9.3
- **Contextual generation options panel** for prompt mode and TOC toggles, scoped to generation only.
- **Generation-only preferences** stored separately from global settings and skipped in anonymous mode.

> Note: The previous cover image generator is temporarily disabled while we revisit the feature.

---

## How to Use

1. Open the **Settings** menu (top-right)  
2. Paste your **OpenRouter API key**  
3. Select an AI model  
4. Enter a main keyword  
5. Configure tone, length, language  
6. (Optional) Select a preset  
7. Click **Generate article**  
8. Copy the Markdown output to your CMS or editor  

All requests go **directly from your browser to OpenRouter**.  
Nothing is stored server-side.

---

## Running Locally

OpenSEO Studio is fully static and can run locally without installation.


### Option 1 — Double-click
Simply open `index.html` in any modern browser.

### Option 2 — Local static server
```bash
python -m http.server 8080
Then visit:
http://localhost:8080/

Service workers and PWA install prompts require a server context (Option 2 or Cloudflare Pages) to register correctly.

## Cloud deployment

Deploy the contents of this repository to **Cloudflare Pages** (or any static host). The included `manifest.json`, `service-worker.js`, and icons are ready for production.

## License
Released under the MIT License. See the LICENSE file for details.

