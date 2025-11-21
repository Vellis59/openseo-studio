# OpenSEO Studio

OpenSEO Studio is a **fully client-side, static SEO writing tool** powered by AI models through [OpenRouter](https://openrouter.ai/).

No backend. No database. Bring Your Own API Key (BYOK).  
Your key stays in your browser. You keep full control.

This repository contains **version 0.1**, the foundation of the project.

---

## Features (v0.1)

- Clean and simple interface (English only)
- FR/EN article generation
- OpenRouter model selection:
  - `openai/gpt-4.1-mini`
  - `openai/gpt-4.1`
  - `openai/gpt-oss-120b`
  - `anthropic/claude-3.5-sonnet`
  - `google/gemini-2.0-flash`
  - `deepseek/deepseek-chat`
- Tone, length and language selectors
- Additional constraints support
- Markdown-only output
- Optional API key storage (localStorage)
- No emojis, no front matter, no HTML output

---

## How to use

1. Open the settings menu (top-right)  
2. Paste your **OpenRouter API key**  
3. Choose your preferred model  
4. Enter a keyword and configure tone/length/language  
5. Click **Generate article**  
6. Copy the Markdown output and use it in your CMS or editor

All requests go **directly from your browser to OpenRouter**.  
No data is sent to any OpenSEO Studio server.

---

## Running locally

You can use OpenSEO Studio even without hosting.

**Option 1 — Double-click**
Simply open `index.html` in your browser.

**Option 2 — Local static server**
```bash
python -m http.server 8080

Then visit:

http://localhost:8080/

Roadmap

The next versions will introduce:

    UX improvements

    Internationalised UI (EN/FR/ES)

    Extra languages for article generation

    Markdown file export

    Presets system

    Import/export presets

    Full documentation and screenshots

License

Released under the MIT License.
See the LICENSE file