# OpenSEO Studio

OpenSEO Studio is a **fully client-side, static SEO writing tool** powered by AI models through [OpenRouter](https://openrouter.ai/).

No backend. No database. Bring Your Own API Key (BYOK).  
Your API key stays in your browser — you keep full control.

---

## ✨ What's New in v2.0.0

### 🎨 Premium Visual Overhaul
- **Glassmorphism design** — transparency effects, backdrop blur, subtle borders for a modern look
- **Typography** — Inter (body) + Outfit (headings) via Google Fonts
- **Micro-animations** — smooth transitions on buttons, inputs, and side panels
- **Refined light & dark themes** — harmonious HSL color palette

### 🏗️ Modular Architecture & Performance
- **Migrated to Vite** — ultra-fast HMR in dev, optimized bundle in production
- **Modularized codebase** — the original 5,000-line monolith (`app.js`) split into logical modules:
  - `src/api/` — centralized API calls (OpenRouter, OpenAI, Ollama, etc.) and prompt engineering
  - `src/services/` — local storage and history management
  - `src/utils/` — SEO analysis, readability scoring, and text processing
- **Cleaned up** — removed redundancies, switched to ES6 modules (import/export)

### 🚀 Powerful New Features
- **Radial SEO Gauge** — animated SVG chart showing your real-time SEO score with premium styling
- **Full Export Suite**:
  - **PDF** — generate formatted PDF files directly in the browser
  - **Word (.docx)** — clean export to Microsoft Word with proper heading hierarchy
  - **Quick Copy** — one-click Markdown copy with visual feedback
- **PWA Support**:
  - Installable on desktop and mobile as a native-like app
  - **Offline mode** — essential files cached via Service Worker for instant loading
  - Custom premium app icon for home screen

### 🌍 Deployment Optimization
- `package.json` set to `type: "module"` for ES module compatibility
- CSS linking standardized for perfect Vite build on Vercel

---

## Core Features

- 100% client-side, static HTML/CSS/JS — no backend, no database
- SEO-optimized long-form article generation
- Markdown-only output (no HTML, no front matter, no emojis)
- 20+ output languages with strict single-language prompts
- Dynamic AI model selection via OpenRouter (auto-fetches models available on your key)
- Multi-provider BYOC: OpenRouter, OpenAI, Anthropic, Gemini (AI Studio), and Ollama
- Optional API gateway mode (Cloudflare Workers supported)
- Export: Markdown, JSON bundle, PDF, Word (.docx)
- Image prompt generation

---

## How to Use

1. Open the **Settings** menu (top-right)
2. Paste your **OpenRouter API key**
3. Select an AI model
4. Enter a main keyword
5. Configure tone, length, language
6. Click **Generate article**
7. Export or copy the output

All requests go **directly from your browser to the AI provider**.  
Nothing is stored server-side.

---

## Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Or simply open `index.html` in any modern browser.

---

## Deployment

Deploy to **Cloudflare Pages**, **Vercel**, or any static host.

### Service worker cleanup (if upgrading from an older version)

```
https://<your-domain>/?resetSW=1
```

To check status:
```
https://<your-domain>/?debugSW=1
```

---

## License

Released under the MIT License. See the [LICENSE](LICENSE) file for details.
