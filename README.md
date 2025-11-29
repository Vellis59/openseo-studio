# OpenSEO Studio

OpenSEO Studio is a **fully client-side, static SEO writing tool** powered by AI models through [OpenRouter](https://openrouter.ai/).

No backend. No database. Bring Your Own API Key (BYOK).  
Your API key stays in your browser — you keep full control.

This repository contains **OpenSEO Studio v0.5.0**, including split-screen editing, light/dark theme controls, offline-ready PWA support, refreshed mobile UX, and new client-side persistence & security controls.

---

## Features (v0.5.0)

### 🧩 Core Functionality
- 100% client-side, static HTML/CSS/JS
- SEO-optimized long-form article generation
- Markdown-only output (no HTML, no front matter, no emojis)
- Supports English and French content generation

### 🔧 AI Model Selection (via OpenRouter)
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1`
- `openai/gpt-oss-120b`
- `anthropic/claude-3.5-sonnet`
- `google/gemini-2.0-flash`
- `deepseek/deepseek-chat`

### ✨ New in v0.5.0
- **Article history (local, client-side)**
  - Automatically keeps the 20 most recent articles with title, keyword, and timestamp.
  - Search bar and overlay to browse, then reload a previous article back into the editor.
- **Safer API key handling**
  - Encrypts the OpenRouter API key with an optional master password (fallback to Base64 if none).
  - "Anonymous mode" toggle to run the app without saving anything to `localStorage`.
- **Configuration import/export**
  - Export prompts, preferences, and history as a JSON file (API key excluded).
  - Import the JSON to restore your setup instantly.
- **Existing UX improvements retained**
  - Light/dark theme toggle with stored preference.
  - Split editor/preview layout with live counters.
  - PWA/offline cache and mobile-friendly gestures.

---

## How to Use

1. Open the **Settings** menu (top-right)  
2. Paste your **OpenRouter API key**  
3. Select an AI model  
4. Enter a main keyword  
5. Configure tone, length, language  
6. (Optional) Select a preset or enable TOC  
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
