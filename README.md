# OpenSEO Studio

OpenSEO Studio is a **fully client-side, static SEO writing tool** powered by AI models through [OpenRouter](https://openrouter.ai/).

No backend. No database. Bring Your Own API Key (BYOK).  
Your API key stays in your browser — you keep full control.

This repository contains **OpenSEO Studio v0.4.0**, including new split-screen editing, light/dark theme controls, offline-ready PWA support, and refreshed mobile UX.

---

## Features (v0.4.0)

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

### ✨ New in v0.4.0
- **Light/Dark Theme Toggle**
  - Follows the system preference by default and stores the user’s choice in `localStorage`.
- **Split-Screen Editor & Live Preview**
  - Markdown editor alongside real-time HTML preview with responsive stacking on mobile.
  - Word and character counters update live while you type.
- **PWA & Offline Readiness**
  - Added `manifest.json`, icons, and a service worker that caches core assets for offline access.
- **Improved Mobile UX**
  - Hamburger navigation, swipe-friendly panel switching, and touch-optimized controls.
- **Enhanced Generation Feedback**
  - Animated progress indicator with estimated remaining time during AI generation.

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
