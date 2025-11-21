const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const menuPanel = document.getElementById("menuPanel");

  const apiKeyInput = document.getElementById("apiKey");
  const rememberKeyCheckbox = document.getElementById("rememberKey");
  const modelSelect = document.getElementById("modelSelect");

  const seoForm = document.getElementById("seoForm");
  const keywordInput = document.getElementById("keyword");
  const languageSelect = document.getElementById("languageSelect");
  const toneSelect = document.getElementById("toneSelect");
  const lengthSelect = document.getElementById("lengthSelect");
  const extraInput = document.getElementById("extraInput");

  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const statusEl = document.getElementById("status");
  const outputArea = document.getElementById("output");

  const STORAGE_KEY_API = "openseo_openrouter_key";
  const STORAGE_KEY_MODEL = "openseo_default_model";

  /* ---------- Menu toggle ---------- */

  menuToggle.addEventListener("click", () => {
    const isOpen = menuPanel.classList.contains("open");
    if (isOpen) {
      menuPanel.classList.remove("open");
      menuPanel.setAttribute("aria-hidden", "true");
    } else {
      menuPanel.classList.add("open");
      menuPanel.setAttribute("aria-hidden", "false");
    }
  });

  document.addEventListener("click", (event) => {
    if (!menuPanel.classList.contains("open")) return;
    const isInsidePanel = menuPanel.contains(event.target);
    const isToggle = menuToggle.contains(event.target);
    if (!isInsidePanel && !isToggle) {
      menuPanel.classList.remove("open");
      menuPanel.setAttribute("aria-hidden", "true");
    }
  });

  /* ---------- Init from localStorage ---------- */

  const storedKey = window.localStorage.getItem(STORAGE_KEY_API);
  if (storedKey) {
    apiKeyInput.value = storedKey;
    rememberKeyCheckbox.checked = true;
  }

  const storedModel = window.localStorage.getItem(STORAGE_KEY_MODEL);
  if (storedModel) {
    modelSelect.value = storedModel;
  }

  modelSelect.addEventListener("change", () => {
    window.localStorage.setItem(STORAGE_KEY_MODEL, modelSelect.value);
  });

  /* ---------- Copy Markdown ---------- */

  copyBtn.addEventListener("click", () => {
    statusEl.classList.remove("error");

    const text = outputArea.value;
    if (!text || !text.trim()) {
      statusEl.textContent = "Nothing to copy: output is empty.";
      statusEl.classList.add("error");
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          statusEl.textContent = "Markdown copied to clipboard.";
        })
        .catch((err) => {
          console.error("clipboard.writeText error:", err);
          fallbackCopy(text);
        });
    } else {
      fallbackCopy(text);
    }
  });

  function fallbackCopy(text) {
    try {
      const selection = window.getSelection();
      const previousRange =
        selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      outputArea.focus();
      outputArea.select();
      outputArea.setSelectionRange(0, text.length);

      const ok = document.execCommand("copy");

      if (previousRange) {
        selection.removeAllRanges();
        selection.addRange(previousRange);
      } else {
        selection.removeAllRanges();
      }

      if (ok) {
        statusEl.textContent = "Markdown copied (fallback).";
        statusEl.classList.remove("error");
      } else {
        statusEl.textContent =
          "Could not copy automatically. Select and copy manually.";
        statusEl.classList.add("error");
      }
    } catch (err) {
      console.error("fallbackCopy error:", err);
      statusEl.textContent =
        "Could not copy automatically. Select and copy manually.";
      statusEl.classList.add("error");
    }
  }

  /* ---------- Clear output ---------- */

  clearBtn.addEventListener("click", () => {
    outputArea.value = "";
    statusEl.textContent = "";
    statusEl.classList.remove("error");
  });

  /* ---------- Generate article ---------- */

  generateBtn.addEventListener("click", async () => {
    statusEl.textContent = "";
    statusEl.classList.remove("error");

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      statusEl.textContent = "Please provide your OpenRouter API key in the settings menu.";
      statusEl.classList.add("error");
      menuPanel.classList.add("open");
      menuPanel.setAttribute("aria-hidden", "false");
      return;
    }

    const keyword = keywordInput.value.trim();
    if (!keyword) {
      statusEl.textContent = "Please enter a main keyword.";
      statusEl.classList.add("error");
      keywordInput.focus();
      return;
    }

    const language = languageSelect.value;
    const tone = toneSelect.value;
    const length = lengthSelect.value;
    const extra = extraInput.value.trim();
    const model = modelSelect.value;

    if (rememberKeyCheckbox.checked) {
      window.localStorage.setItem(STORAGE_KEY_API, apiKey);
    } else {
      window.localStorage.removeItem(STORAGE_KEY_API);
    }

    const userPrompt = buildUserPrompt({
      keyword,
      language,
      tone,
      length,
      extra,
    });

    const body = {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a senior SEO content writer. You write long-form, well-structured, " +
            "readable blog posts that follow on-page SEO best practices. You only output Markdown " +
            "(headings, lists, tables when useful), with no YAML front matter and no raw HTML. " +
            "Avoid emojis and generic, overused AI-style introductions.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
    };

    try {
      generateBtn.disabled = true;
      generateBtn.textContent = "Generating...";
      statusEl.textContent = "Contacting OpenRouter...";

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API error ${response.status}: ${text}`);
      }

      const data = await response.json();
      const content =
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content
          ? data.choices[0].message.content
          : "";

      if (!content) {
        throw new Error("Empty or unexpected API response.");
      }

      outputArea.value = content;
      statusEl.textContent = "Article generated. You can now copy the Markdown.";
    } catch (error) {
      console.error(error);
      statusEl.textContent = `Error: ${error.message}`;
      statusEl.classList.add("error");
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate article";
    }
  });
});

/**
 * Build the user prompt for the SEO article generator.
 */
function buildUserPrompt({ keyword, language, tone, length, extra }) {
  const lines = [];

  lines.push(
    `Write a long-form SEO-optimized blog post in ${language}.`,
    `Main keyword: "${keyword}".`,
    `Tone: ${tone}.`,
    `Target length: ${length}.`,
    ""
  );

  lines.push("Writing constraints:");
  lines.push("- Output strictly in Markdown (no HTML, no YAML front matter).");
  lines.push("- Start with a strong, useful H1 title.");
  lines.push(
    "- Use a clear heading hierarchy (H2, H3, H4 if necessary) that reflects a solid SEO structure."
  );
  lines.push(
    "- Write a short and direct introduction, without generic or overused AI-style phrases."
  );
  lines.push("- Use short paragraphs and clear sentences.");
  lines.push("- Use bullet lists or numbered lists when useful.");
  lines.push(
    "- Add a table in Markdown if it helps compare options, steps, tools or features."
  );
  lines.push(
    "- End with a conclusion that summarises the key points and suggests a concrete next step."
  );
  lines.push("- Do not add YAML front matter.");
  lines.push("- Do not use emojis.");
  lines.push("");

  if (extra) {
    lines.push(`Additional options or constraints: ${extra}`);
  }

  return lines.join("\n");
}
