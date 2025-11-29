# OpenSEO Studio

OpenSEO Studio is a **fully client-side, static SEO writing tool** powered by AI models through [OpenRouter](https://openrouter.ai/).

No backend. No database. Bring Your Own API Key (BYOK).  
Your API key stays in your browser — you keep full control.

This repository contains **OpenSEO Studio v0.6.0**, including split-screen editing, light/dark theme controls, offline-ready PWA support, refreshed mobile UX, and new client-side persistence & security controls.

---

## Features (v0.6.0)

### 🧩 Core Functionality
- 100% client-side, static HTML/CSS/JS
- SEO-optimized long-form article generation
- Markdown-only output (no HTML, no front matter, no emojis)
- Supports English and French content generation

### 🔧 AI Model Selection (Dynamic via OpenRouter)

OpenSEO Studio no longer uses a fixed list of AI models.

When you enter your OpenRouter API key, the app automatically fetches all models available on your account (including premium, BYOK and new models), and updates the selector in real time.

✔ Always up to date
✔ No hard-coded list
✔ Models depend on your API key

(The model list is dynamically loaded — it may differ for each user)

### ✨ New in v0.6.0
- **Expert Mode controls** to tweak temperature, max tokens, top-p, and frequency penalty, with token and cost estimations plus a local monthly spend tracker.
- **3-step workflow** (plan → review → generate) with editable outlines and step indicators for section-by-section generation.
- **Selective regeneration tools** to rewrite or retone highlighted passages without rebuilding the full article.
- **Image generation pipeline** integrated with OpenRouter image models (including SDXL, SDXL Turbo, Flux 1.1 Pro) and optional cover image + ALT text previews.
- **Dynamic costs** and outline-aware prompts designed for partial/section-by-section generation.

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
