# OpenSEO Studio

OpenSEO Studio is a **fully client-side, static SEO writing tool** powered by AI models through [OpenRouter](https://openrouter.ai/).

No backend. No database. Bring Your Own API Key (BYOK).  
Your API key stays in your browser — you keep full control.

This repository contains **OpenSEO Studio v0.3**, including AI presets, prompt modes, onboarding, and a cleaner UX.

---

## Features (v0.3)

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

### ✨ New in v0.3
- **6 AI presets**  
  (Guide, Long Article, Tutorial, Comparison, Listicle, News)
- **Prompt Mode**  
  Switch between *Standard* and *Minimal* instructions
- **Optional Markdown TOC**  
  Auto-injects a table of contents at the top of the article
- **Onboarding overlay**  
  Helps new users configure their API key
- **Clean error messages**  
  Improved handling of OpenRouter responses
- **UI polish**  
  Better padding, clearer loading state, refined buttons, improved UX

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

Cloud-ready version (optional)

License
Released under the MIT License.
See the LICENSE file for details.
