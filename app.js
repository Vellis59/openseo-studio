const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const menuPanel = document.getElementById("menuPanel");
  const themeToggle = document.getElementById("themeToggle");

  const apiKeyInput = document.getElementById("apiKey");
  const rememberKeyCheckbox = document.getElementById("rememberKey");
  const modelSelect = document.getElementById("modelSelect");
  const resetStorageBtn = document.getElementById("resetStorageBtn");

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

  const presetSelect = document.getElementById("presetSelect");
  const promptModeSelect = document.getElementById("promptMode");
  const tocCheckbox = document.getElementById("tocCheckbox");

  const previewEl = document.getElementById("preview");
  const wordCountEl = document.getElementById("wordCount");
  const charCountEl = document.getElementById("charCount");
  const splitLayout = document.getElementById("splitLayout");
  const viewEditorBtn = document.getElementById("viewEditorBtn");
  const viewPreviewBtn = document.getElementById("viewPreviewBtn");
  const progressBar = document.getElementById("progressBar");
  const progressLabel = document.getElementById("progressLabel");
  const etaLabel = document.getElementById("etaLabel");
  const progressShell = document.querySelector(".progress-shell");

  const onboarding = document.getElementById("onboarding");
  const onboardingClose = document.getElementById("onboardingClose");

  const STORAGE_KEY_API = "openseo_openrouter_key";
  const STORAGE_KEY_MODEL = "openseo_default_model";
  const STORAGE_KEY_THEME = "openseo_color_theme";

  /* ---------- Menu toggle ---------- */

  if (menuToggle && menuPanel) {
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
  }

  /* ---------- Init from localStorage ---------- */

  const storedKey = window.localStorage.getItem(STORAGE_KEY_API);
  if (storedKey) {
    apiKeyInput.value = storedKey;
    if (rememberKeyCheckbox) {
      rememberKeyCheckbox.checked = true;
    }
    fetchAndPopulateModels(storedKey);
  } else if (onboarding) {
    // Onboarding: pas de clé connue → montrer l’overlay
    onboarding.classList.remove("hidden");
  }

  /* ---------- Theme toggle ---------- */

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeToggle) {
      themeToggle.textContent = theme === "light" ? "☀️" : "🌙";
      themeToggle.setAttribute("aria-label", `Switch to ${theme === "light" ? "dark" : "light"} theme`);
    }
  }

  function resolveTheme() {
    const stored = window.localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === "light" || stored === "dark") return stored;
    return prefersDark.matches ? "dark" : "light";
  }

  function persistTheme(theme) {
    window.localStorage.setItem(STORAGE_KEY_THEME, theme);
  }

  applyTheme(resolveTheme());

  prefersDark.addEventListener("change", () => {
    const stored = window.localStorage.getItem(STORAGE_KEY_THEME);
    if (!stored) {
      applyTheme(resolveTheme());
    }
  });

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const nextTheme = resolveTheme() === "light" ? "dark" : "light";
      applyTheme(nextTheme);
      persistTheme(nextTheme);
    });
  }

  const storedModel = window.localStorage.getItem(STORAGE_KEY_MODEL);
  if (storedModel) {
    modelSelect.value = storedModel;
  }

  if (modelSelect) {
    modelSelect.addEventListener("change", () => {
      window.localStorage.setItem(STORAGE_KEY_MODEL, modelSelect.value);
    });
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener("change", () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        clearModelOptions();
        return;
      }
      if (rememberKeyCheckbox && rememberKeyCheckbox.checked) {
        window.localStorage.setItem(STORAGE_KEY_API, key);
      } else {
        window.localStorage.removeItem(STORAGE_KEY_API);
      }
      fetchAndPopulateModels(key);
    });
  }

  if (rememberKeyCheckbox) {
    rememberKeyCheckbox.addEventListener("change", () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        window.localStorage.removeItem(STORAGE_KEY_API);
        return;
      }
      if (rememberKeyCheckbox.checked) {
        window.localStorage.setItem(STORAGE_KEY_API, key);
      } else {
        window.localStorage.removeItem(STORAGE_KEY_API);
      }
    });
  }

  /* ---------- Onboarding ---------- */

  if (onboarding && onboardingClose) {
    onboardingClose.addEventListener("click", () => {
      onboarding.classList.add("hidden");
      // Ouvrir le panel de settings pour guider l’utilisateur
      if (menuPanel) {
        menuPanel.classList.add("open");
        menuPanel.setAttribute("aria-hidden", "false");
      }
      if (apiKeyInput) {
        apiKeyInput.focus();
      }
    });
  }

  /* ---------- Presets ---------- */

  const PRESETS = {
    guide: {
      tone: "clear and accessible",
      length: "standard (~1500 words)",
      extra: "Write as a step-by-step guide."
    },
    long: {
      tone: "friendly and slightly edgy",
      length: "long (~2500 words)",
      extra: ""
    },
    tutorial: {
      tone: "professional and neutral",
      length: "standard (~1500 words)",
      extra: "Write as a complete tutorial with numbered steps."
    },
    comparison: {
      tone: "professional and neutral",
      length: "standard (~1500 words)",
      extra: "Include a Markdown comparison table."
    },
    listicle: {
      tone: "clear and accessible",
      length: "short (~800 words)",
      extra: "Write in listicle format."
    },
    news: {
      tone: "professional and neutral",
      length: "short (~800 words)",
      extra: "Write in a concise, news-like style."
    }
  };

  if (presetSelect) {
    presetSelect.addEventListener("change", () => {
      const preset = PRESETS[presetSelect.value];
      if (!preset) return;

      // Appliquer le preset sur les champs correspondants
      if (toneSelect) {
        toneSelect.value = preset.tone;
      }
      if (lengthSelect) {
        lengthSelect.value = preset.length;
      }
      if (extraInput) {
        extraInput.value = preset.extra;
      }
    });
  }

  /* ---------- Reset localStorage ---------- */

  if (resetStorageBtn) {
    resetStorageBtn.addEventListener("click", () => {
      window.localStorage.removeItem(STORAGE_KEY_API);
      window.localStorage.removeItem(STORAGE_KEY_MODEL);
      apiKeyInput.value = "";
      if (rememberKeyCheckbox) {
        rememberKeyCheckbox.checked = false;
      }
      statusEl.classList.remove("error", "loading");
      statusEl.textContent = "Local storage cleared.";

      clearModelOptions();

      if (onboarding) {
        onboarding.classList.remove("hidden");
      }
    });
  }

  /* ---------- Editor & preview sync ---------- */

  function updateMetrics() {
    if (!outputArea) return;
    const text = outputArea.value;
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    if (wordCountEl) {
      wordCountEl.textContent = `${words} ${words === 1 ? "word" : "words"}`;
    }
    if (charCountEl) {
      charCountEl.textContent = `${chars} chars`;
    }
  }

  function renderPreview(text) {
    if (!previewEl) return;
    if (!text || !text.trim()) {
      previewEl.innerHTML = '<p class="preview-placeholder">Start typing or generate content to see the preview.</p>';
      return;
    }

    try {
      if (window.marked && typeof window.marked.parse === "function") {
        previewEl.innerHTML = window.marked.parse(text);
      } else {
        previewEl.textContent = text;
      }
    } catch (err) {
      console.error("renderPreview error", err);
      previewEl.textContent = text;
    }
  }

  if (outputArea) {
    outputArea.addEventListener("input", () => {
      updateMetrics();
      renderPreview(outputArea.value);
    });
    updateMetrics();
    renderPreview(outputArea.value);
  }

  /* ---------- Mobile view toggles & gestures ---------- */

  if (splitLayout) {
    splitLayout.dataset.view = "editor";
  }

  function setView(view) {
    if (!splitLayout) return;
    splitLayout.dataset.view = view;
    if (viewEditorBtn && viewPreviewBtn) {
      viewEditorBtn.classList.toggle("active", view === "editor");
      viewPreviewBtn.classList.toggle("active", view === "preview");
    }
  }

  if (viewEditorBtn && viewPreviewBtn) {
    viewEditorBtn.addEventListener("click", () => setView("editor"));
    viewPreviewBtn.addEventListener("click", () => setView("preview"));
  }

  let touchStartX = null;
  let touchStartY = null;

  if (splitLayout) {
    splitLayout.addEventListener("touchstart", (evt) => {
      const touch = evt.changedTouches[0];
      touchStartX = touch.screenX;
      touchStartY = touch.screenY;
    });

    splitLayout.addEventListener("touchend", (evt) => {
      const touch = evt.changedTouches[0];
      if (touchStartX === null || touchStartY === null) return;

      const deltaX = touch.screenX - touchStartX;
      const deltaY = touch.screenY - touchStartY;
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40;

      if (window.innerWidth <= 900 && isHorizontal) {
        const nextView = deltaX < 0 ? "preview" : "editor";
        setView(nextView);
      }

      touchStartX = null;
      touchStartY = null;
    });
  }

  /* ---------- Load models from OpenRouter ---------- */

  async function fetchAndPopulateModels(apiKey) {
    if (!modelSelect) return;

    modelSelect.disabled = true;
    statusEl.classList.remove("error");
    statusEl.classList.add("loading");
    statusEl.textContent = "Loading models from OpenRouter...";

    try {
      const response = await fetch(OPENROUTER_MODELS_URL, {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        const text = await response.text();
        let message = `Unable to fetch models (${response.status}).`;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error?.message) {
            message = parsed.error.message;
          }
        } catch {
          // noop
        }
        throw new Error(message);
      }

      const payload = await response.json();
      const models = Array.isArray(payload?.data) ? payload.data : [];
      populateModelOptions(models);
      statusEl.classList.remove("loading");
      statusEl.textContent = models.length
        ? "Models loaded. Choose your preferred model."
        : "No models returned by OpenRouter.";
    } catch (err) {
      console.error("fetchAndPopulateModels error:", err);
      statusEl.classList.remove("loading");
      statusEl.classList.add("error");
      statusEl.textContent = `Could not load models: ${err.message}`;
      clearModelOptions();
    }
  }

  function populateModelOptions(models) {
    if (!modelSelect) return;

    modelSelect.innerHTML = "";

    if (!models.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No models available";
      modelSelect.appendChild(option);
      modelSelect.disabled = true;
      window.localStorage.removeItem(STORAGE_KEY_MODEL);
      return;
    }

    const storedModel = window.localStorage.getItem(STORAGE_KEY_MODEL);
    const sortedModels = models
      .filter((m) => m?.id)
      .sort((a, b) => a.id.localeCompare(b.id));

    sortedModels.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name || model.id;
      option.title = model.description || model.id;
      modelSelect.appendChild(option);
    });

    if (storedModel && sortedModels.some((m) => m.id === storedModel)) {
      modelSelect.value = storedModel;
    }

    if (!modelSelect.value && sortedModels[0]) {
      modelSelect.value = sortedModels[0].id;
      window.localStorage.setItem(STORAGE_KEY_MODEL, sortedModels[0].id);
    }

    modelSelect.disabled = false;
  }

  function clearModelOptions() {
    if (!modelSelect) return;
    modelSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Enter your API key to load models";
    modelSelect.appendChild(placeholder);
    modelSelect.disabled = true;
    window.localStorage.removeItem(STORAGE_KEY_MODEL);
  }

  /* ---------- Copy Markdown ---------- */

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      statusEl.classList.remove("error", "loading");

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
  }

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

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      outputArea.value = "";
      statusEl.textContent = "";
      statusEl.classList.remove("error", "loading");
      updateMetrics();
      renderPreview("");
    });
  }

  /* ---------- Progress & ETA ---------- */

  const ESTIMATED_SECONDS = [
    { match: "short", seconds: 16 },
    { match: "standard", seconds: 24 },
    { match: "long", seconds: 32 },
    { match: "ultra", seconds: 42 }
  ];

  let progressInterval = null;
  let progressStart = null;

  function estimateDuration(lengthLabel) {
    const lower = (lengthLabel || "").toLowerCase();
    const found = ESTIMATED_SECONDS.find((item) => lower.includes(item.match));
    return found ? found.seconds : 22;
  }

  function formatSeconds(value) {
    if (value <= 0) return "0s";
    if (value < 60) return `${Math.ceil(value)}s`;
    const minutes = Math.floor(value / 60);
    const seconds = Math.ceil(value % 60);
    return `${minutes}m ${seconds}s`;
  }

  function startProgress(lengthLabel) {
    const estimate = estimateDuration(lengthLabel);
    progressStart = performance.now();

    if (progressShell) {
      progressShell.setAttribute("aria-hidden", "false");
    }
    if (progressBar) {
      progressBar.style.width = "8%";
    }
    if (progressLabel) {
      progressLabel.textContent = "Contacting OpenRouter...";
    }
    if (etaLabel) {
      etaLabel.textContent = `~${formatSeconds(estimate)}`;
    }

    if (progressInterval) {
      clearInterval(progressInterval);
    }

    progressInterval = window.setInterval(() => {
      const elapsed = (performance.now() - progressStart) / 1000;
      const remaining = Math.max(0, estimate - elapsed);
      const percent = Math.min(92, Math.max(12, (elapsed / estimate) * 100));

      if (progressBar) {
        progressBar.style.width = `${percent}%`;
      }
      if (progressLabel) {
        progressLabel.textContent = remaining > 0
          ? "Generating with your model..."
          : "Finishing up...";
      }
      if (etaLabel) {
        etaLabel.textContent = remaining > 0 ? `~${formatSeconds(remaining)}` : "almost done";
      }
    }, 400);

    return (success = true) => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      if (progressBar) {
        progressBar.style.width = "100%";
      }
      if (progressLabel) {
        progressLabel.textContent = success ? "Done" : "Stopped";
      }
      if (etaLabel) {
        etaLabel.textContent = "0s";
      }

      window.setTimeout(() => {
        if (progressBar) {
          progressBar.style.width = "0";
        }
        if (progressLabel) {
          progressLabel.textContent = "Ready";
        }
        if (etaLabel) {
          etaLabel.textContent = "—";
        }
      }, 900);
    };
  }

  /* ---------- Generate article ---------- */

  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      statusEl.textContent = "";
      statusEl.classList.remove("error", "loading");

      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        statusEl.textContent = "Please provide your OpenRouter API key in the settings menu.";
        statusEl.classList.add("error");
        if (menuPanel) {
          menuPanel.classList.add("open");
          menuPanel.setAttribute("aria-hidden", "false");
        }
        if (onboarding) {
          onboarding.classList.remove("hidden");
        }
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

      if (!model) {
        statusEl.textContent = "Please select a model (load them from OpenRouter first).";
        statusEl.classList.add("error");
        if (menuPanel) {
          menuPanel.classList.add("open");
          menuPanel.setAttribute("aria-hidden", "false");
        }
        return;
      }

      if (rememberKeyCheckbox && rememberKeyCheckbox.checked) {
        window.localStorage.setItem(STORAGE_KEY_API, apiKey);
      } else {
        window.localStorage.removeItem(STORAGE_KEY_API);
      }

      const userPrompt = buildUserPrompt({
        keyword,
        language,
        tone,
        length,
        extra
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
              "Avoid emojis and generic, overused AI-style introductions."
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.7
      };

      let endProgress;
      try {
        generateBtn.disabled = true;
        generateBtn.textContent = "Generating...";

        if (tocCheckbox && tocCheckbox.checked) {
          statusEl.textContent = "TOC enabled. Contacting OpenRouter...";
        } else {
          statusEl.textContent = "Contacting OpenRouter...";
        }
        statusEl.classList.add("loading");
        statusEl.classList.remove("error");

        endProgress = startProgress(length);
        statusEl.textContent = `${statusEl.textContent} ETA ${etaLabel ? etaLabel.textContent : "~"}`;

        const response = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const text = await response.text();
          let message = `API error ${response.status}`;
          try {
            const parsed = JSON.parse(text);
            if (parsed && parsed.error && parsed.error.message) {
              message = parsed.error.message;
            }
          } catch {
            // fallback : on garde le message par défaut
          }
          throw new Error(message);
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
        updateMetrics();
        renderPreview(content);
        statusEl.textContent = "Article generated. You can now copy the Markdown.";
        statusEl.classList.remove("loading");
      } catch (error) {
        console.error(error);
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.classList.remove("loading");
        statusEl.classList.add("error");
      } finally {
        if (endProgress) {
          endProgress(!statusEl.classList.contains("error"));
        }
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate article";
      }
    });
  }

  /* ---------- Service worker ---------- */

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("Service worker registration failed", err));
  }
});

/* ---------- Prompt helpers ---------- */

function standardPrompt(lines) {
  return lines;
}

function minimalPrompt(lines) {
  const result = [];

  // Garder le contexte de base
  for (let i = 0; i < lines.length; i++) {
    if (i <= 4) {
      result.push(lines[i]);
    }
  }

  result.push("");
  result.push("Write clearly. No fluff. Short intro.");
  result.push("Use H2/H3 only when really useful.");
  result.push("Keep paragraphs tight and focused.");
  result.push("");

  // Garder la dernière ligne si c’est une contrainte additionnelle
  const last = lines[lines.length - 1];
  if (last && last.trim()) {
    result.push(last);
  }

  return result;
}

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

  const tocCheckbox = document.getElementById("tocCheckbox");
  if (tocCheckbox && tocCheckbox.checked) {
    lines.push(
      "At the beginning of the article, add a Markdown table of contents with internal links to the main sections."
    );
  }

  const promptModeSelect = document.getElementById("promptMode");
  const mode = promptModeSelect ? promptModeSelect.value : "standard";

  if (mode === "minimal") {
    return minimalPrompt(lines).join("\n");
  }

  return standardPrompt(lines).join("\n");
}
