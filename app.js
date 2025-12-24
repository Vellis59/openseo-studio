const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

const MODEL_PRICING = {
  default: { prompt: 0.003, completion: 0.006 }
};

const LANGUAGES = {
  en: {
    label: "English",
    promptName: "English",
    seoNotes: "Use natural phrasing suited to search intent and readability."
  },
  fr: {
    label: "French",
    promptName: "French",
    seoNotes: "Respect French typographic rules and natural SEO wording."
  },
  es: { label: "Spanish", promptName: "Spanish" },
  de: { label: "German", promptName: "German" },
  it: { label: "Italian", promptName: "Italian" },
  "pt-pt": {
    label: "Portuguese (Portugal)",
    promptName: "European Portuguese",
    seoNotes: "Use vocabulary and spelling for Portugal."
  },
  "pt-br": {
    label: "Portuguese (Brazil)",
    promptName: "Brazilian Portuguese",
    seoNotes: "Use vocabulary and spelling for Brazil."
  },
  nl: { label: "Dutch", promptName: "Dutch" },
  pl: { label: "Polish", promptName: "Polish" },
  sv: { label: "Swedish", promptName: "Swedish" },
  da: { label: "Danish", promptName: "Danish" },
  fi: { label: "Finnish", promptName: "Finnish" },
  no: { label: "Norwegian", promptName: "Norwegian" },
  cs: { label: "Czech", promptName: "Czech" },
  ro: { label: "Romanian", promptName: "Romanian" },
  hu: { label: "Hungarian", promptName: "Hungarian" },
  el: { label: "Greek", promptName: "Greek" },
  tr: { label: "Turkish", promptName: "Turkish" },
  id: { label: "Indonesian", promptName: "Indonesian" },
  ja: { label: "Japanese", promptName: "Japanese", seoNotes: "Write naturally for Japanese readers without forcing Western phrasing." },
  ko: { label: "Korean", promptName: "Korean" },
  "zh-hans": {
    label: "Simplified Chinese",
    promptName: "Simplified Chinese",
    seoNotes: "Use Simplified Chinese characters and natural SEO phrasing."
  },
  "zh-hant": {
    label: "Traditional Chinese",
    promptName: "Traditional Chinese",
    seoNotes: "Use Traditional Chinese characters and natural SEO phrasing."
  },
  ar: { label: "Arabic", promptName: "Arabic" }
};

const NON_LATIN_LANGUAGE_CODES = new Set(["ja", "ko", "zh-hans", "zh-hant", "ar"]);
const DEFAULT_LANGUAGE = "en";

function getLanguageConfig(value) {
  const input = value || DEFAULT_LANGUAGE;
  if (LANGUAGES[input]) {
    return { code: input, ...LANGUAGES[input] };
  }

  const lower = input.toLowerCase();
  const match = Object.entries(LANGUAGES).find(([, data]) => {
    return (
      data.label.toLowerCase() === lower ||
      data.promptName.toLowerCase() === lower
    );
  });

  const code = match ? match[0] : DEFAULT_LANGUAGE;
  return { code, ...LANGUAGES[code] };
}

function populateLanguageSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = "";

  Object.entries(LANGUAGES).forEach(([code, data]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = data.label;
    selectEl.appendChild(option);
  });

  selectEl.value = DEFAULT_LANGUAGE;
}

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const menuPanel = document.getElementById("menuPanel");
  const themeToggle = document.getElementById("themeToggle");

  const apiKeyInput = document.getElementById("apiKey");
  const rememberKeyCheckbox = document.getElementById("rememberKey");
  const masterPasswordInput = document.getElementById("masterPassword");
  const anonymousModeCheckbox = document.getElementById("anonymousMode");
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
  const exportToggleBtn = document.getElementById("exportToggleBtn");
  const exportMenu = document.getElementById("exportMenu");
  const exportModal = document.getElementById("exportModal");
  const closeExportModalBtn = document.getElementById("closeExportModalBtn");
  const exportModalTitle = document.getElementById("exportModalTitle");
  const exportModalSubtitle = document.getElementById("exportModalSubtitle");
  const exportModalBody = document.getElementById("exportModalBody");

  const presetSelect = document.getElementById("presetSelect");
  const promptModeSelect = document.getElementById("promptMode");
  const tocCheckbox = document.getElementById("tocCheckbox");

  const expertToggle = document.getElementById("expertToggle");
  const expertPanel = document.getElementById("expertPanel");
  const temperatureInput = document.getElementById("temperatureInput");
  const maxTokensInput = document.getElementById("maxTokensInput");
  const topPInput = document.getElementById("topPInput");
  const frequencyPenaltyInput = document.getElementById("frequencyPenaltyInput");
  const tokenEstimateEl = document.getElementById("tokenEstimate");
  const costEstimateEl = document.getElementById("costEstimate");
  const monthlySpendEl = document.getElementById("monthlySpend");

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

  const planBtn = document.getElementById("planBtn");
  const planEditor = document.getElementById("planEditor");
  const regeneratePlanBtn = document.getElementById("regeneratePlanBtn");
  const stepPlan = document.getElementById("stepPlan");
  const stepReview = document.getElementById("stepReview");
  const stepGenerate = document.getElementById("stepGenerate");

  const generateMetadataBtn = document.getElementById("generateMetadataBtn");
  const seoScoreValue = document.getElementById("seoScoreValue");
  const seoScoreBar = document.getElementById("seoScoreBar");
  const seoChecksList = document.getElementById("seoChecksList");
  const seoSuggestionsList = document.getElementById("seoSuggestionsList");
  const readabilityScoreEl = document.getElementById("readabilityScore");
  const averageSentenceLengthEl = document.getElementById("averageSentenceLength");
  const complexSentencesList = document.getElementById("complexSentencesList");
  const seoTitleText = document.getElementById("seoTitleText");
  const metaDescriptionText = document.getElementById("metaDescriptionText");
  const secondaryKeywordsText = document.getElementById("secondaryKeywordsText");

  const regenSelectionBtn = document.getElementById("regenSelectionBtn");
  const toneSelectionBtn = document.getElementById("toneSelectionBtn");

  populateLanguageSelect(languageSelect);

  const openHistoryBtn = document.getElementById("openHistoryBtn");
  const historyOverlay = document.getElementById("historyOverlay");
  const closeHistoryBtn = document.getElementById("closeHistoryBtn");
  const historyList = document.getElementById("historyList");
  const historySearch = document.getElementById("historySearch");

  const exportConfigBtn = document.getElementById("exportConfigBtn");
  const importConfigBtn = document.getElementById("importConfigBtn");
  const importConfigInput = document.getElementById("importConfigInput");

  const onboarding = document.getElementById("onboarding");
  const onboardingClose = document.getElementById("onboardingClose");

  const generationOptionsBtn = document.getElementById("generationOptionsBtn");
  const generationOptionsPanel = document.getElementById("generationOptionsPanel");

  const STORAGE_KEY_API = "openseo_openrouter_key";
  const STORAGE_KEY_MODEL = "openseo_default_model";
  const STORAGE_KEY_THEME = "openseo_color_theme";
  const STORAGE_KEY_HISTORY = "openseo_article_history";
  const STORAGE_KEY_SPEND = "openseo_monthly_spend";
  const STORAGE_KEY_GENERATION_OPTIONS = "openseo_generation_options";

  const MAX_HISTORY_ITEMS = 20;
  const GENERATION_OPTIONS_DEFAULTS = {
    promptMode: "standard",
    tocEnabled: false
  };

  let isAnonymous = false;
  let encryptedKeyPayload = null;
  let historyCache = [];
  let generationOptions = { ...GENERATION_OPTIONS_DEFAULTS };

  function setItemGuarded(key, value) {
    if (isAnonymous) return;
    window.localStorage.setItem(key, value);
  }

  function removeItem(key) {
    window.localStorage.removeItem(key);
  }

  function clearAppStorage() {
    [
      STORAGE_KEY_API,
      STORAGE_KEY_MODEL,
      STORAGE_KEY_THEME,
      STORAGE_KEY_HISTORY,
      STORAGE_KEY_SPEND,
      STORAGE_KEY_GENERATION_OPTIONS
    ].forEach((key) => {
      window.localStorage.removeItem(key);
    });
  }

  function loadMonthlySpend() {
    if (isAnonymous) return 0;
    const raw = window.localStorage.getItem(STORAGE_KEY_SPEND);
    return raw ? parseFloat(raw) || 0 : 0;
  }

  function persistMonthlySpend(value) {
    if (isAnonymous) return;
    setItemGuarded(STORAGE_KEY_SPEND, String(value.toFixed(2)));
  }

  function normalizeGenerationOptions(options = {}) {
    return {
      promptMode: options.promptMode || GENERATION_OPTIONS_DEFAULTS.promptMode,
      tocEnabled: Boolean(options.tocEnabled)
    };
  }

  function loadGenerationOptions() {
    if (isAnonymous) {
      return { ...GENERATION_OPTIONS_DEFAULTS };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY_GENERATION_OPTIONS);
    if (!raw) {
      return { ...GENERATION_OPTIONS_DEFAULTS };
    }
    try {
      const parsed = JSON.parse(raw);
      return normalizeGenerationOptions(parsed);
    } catch (err) {
      console.warn("Unable to parse generation options:", err);
      return { ...GENERATION_OPTIONS_DEFAULTS };
    }
  }

  function persistGenerationOptions(options) {
    if (isAnonymous) return;
    setItemGuarded(STORAGE_KEY_GENERATION_OPTIONS, JSON.stringify(options));
  }

  function applyGenerationOptions(options) {
    generationOptions = normalizeGenerationOptions(options);
    if (promptModeSelect) {
      promptModeSelect.value = generationOptions.promptMode;
    }
    if (tocCheckbox) {
      tocCheckbox.checked = generationOptions.tocEnabled;
    }
  }

  function syncGenerationOptionsFromUI() {
    if (!promptModeSelect || !tocCheckbox) return;
    generationOptions = normalizeGenerationOptions({
      promptMode: promptModeSelect.value,
      tocEnabled: tocCheckbox.checked
    });
    persistGenerationOptions(generationOptions);
  }

  function base64Encode(text) {
    try {
      return btoa(unescape(encodeURIComponent(text)));
    } catch (err) {
      console.error("base64Encode error", err);
      return "";
    }
  }

  function base64Decode(text) {
    try {
      return decodeURIComponent(escape(atob(text)));
    } catch (err) {
      console.error("base64Decode error", err);
      return "";
    }
  }

  // Keep API key header-safe by stripping non ISO-8859-1 characters.
  function sanitizeApiKey(value) {
    if (!value) return "";
    return value
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .trim();
  }

  function xorEncrypt(text, password) {
    if (!password) return base64Encode(text);
    const cipher = text
      .split("")
      .map((char, idx) => String.fromCharCode(char.charCodeAt(0) ^ password.charCodeAt(idx % password.length)))
      .join("");
    return base64Encode(cipher);
  }

  function xorDecrypt(cipher, password) {
    if (!password) return base64Decode(cipher);
    const decoded = base64Decode(cipher);
    return decoded
      .split("")
      .map((char, idx) => String.fromCharCode(char.charCodeAt(0) ^ password.charCodeAt(idx % password.length)))
      .join("");
  }

  function deriveHistoryTitle(content) {
    if (!content) return "Untitled article";
    const firstNonEmpty = content
      .split(/\n+/)
      .map((l) => l.trim())
      .find((line) => line);
    if (!firstNonEmpty) return "Untitled article";
    return firstNonEmpty.replace(/^#+\s*/, "").slice(0, 140) || "Untitled article";
  }

  function loadHistoryFromStorage() {
    if (isAnonymous) return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_HISTORY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("loadHistoryFromStorage error", err);
      return [];
    }
  }

  function persistHistory() {
    if (isAnonymous) return;
    setItemGuarded(STORAGE_KEY_HISTORY, JSON.stringify(historyCache));
  }

  function renderHistory(filterText = "") {
    if (!historyList) return;
    const needle = filterText.trim().toLowerCase();
    const filtered = historyCache.filter((entry) => {
      if (!needle) return true;
      return (
        entry.title.toLowerCase().includes(needle) ||
        (entry.keyword && entry.keyword.toLowerCase().includes(needle)) ||
        (entry.content && entry.content.toLowerCase().includes(needle))
      );
    });

    historyList.innerHTML = "";

    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "field-help";
      empty.textContent = "No matching articles in history.";
      historyList.appendChild(empty);
      return;
    }

    filtered.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.dataset.id = entry.id;

      const title = document.createElement("p");
      title.className = "history-item-title";
      title.textContent = entry.title;

      const meta = document.createElement("p");
      meta.className = "history-item-meta";
      const date = new Date(entry.createdAt);
      meta.textContent = `${date.toLocaleString()}${entry.keyword ? ` • ${entry.keyword}` : ""}`;

      item.append(title, meta);
      historyList.appendChild(item);
    });
  }

  function addHistoryEntry({ content, keyword }) {
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      title: deriveHistoryTitle(content),
      keyword: keyword || "",
      content,
      createdAt: new Date().toISOString()
    };

    historyCache = [entry, ...historyCache].slice(0, MAX_HISTORY_ITEMS);
    persistHistory();
    renderHistory(historySearch ? historySearch.value : "");
  }

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

  function hydrateApiKeyFromStorage() {
    if (!apiKeyInput || isAnonymous) return;
    const raw = window.localStorage.getItem(STORAGE_KEY_API);
    if (!raw) {
      if (onboarding) {
        onboarding.classList.remove("hidden");
      }
      return;
    }

    try {
      const payload = JSON.parse(raw);
      encryptedKeyPayload = payload;
      if (rememberKeyCheckbox) {
        rememberKeyCheckbox.checked = true;
      }

      if (payload.method === "base64") {
        const key = base64Decode(payload.cipher);
        apiKeyInput.value = key;
        fetchAndPopulateModels(key);
        return;
      }

      if (payload.method === "xor") {
        const password = masterPasswordInput ? masterPasswordInput.value : "";
        if (password) {
          const key = xorDecrypt(payload.cipher, password);
          apiKeyInput.value = key;
          fetchAndPopulateModels(key);
        } else if (statusEl) {
          statusEl.textContent = "Enter your master password to unlock the API key.";
          statusEl.classList.add("error");
        }
      }
    } catch (err) {
      console.error("hydrateApiKeyFromStorage error", err);
      window.localStorage.removeItem(STORAGE_KEY_API);
    }
  }

  historyCache = loadHistoryFromStorage();
  renderHistory();
  hydrateApiKeyFromStorage();

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
    if (!isAnonymous) {
      const stored = window.localStorage.getItem(STORAGE_KEY_THEME);
      if (stored === "light" || stored === "dark") return stored;
    }
    return prefersDark.matches ? "dark" : "light";
  }

  function persistTheme(theme) {
    setItemGuarded(STORAGE_KEY_THEME, theme);
  }

  applyTheme(resolveTheme());

  prefersDark.addEventListener("change", () => {
    if (isAnonymous) return;
    const stored = window.localStorage.getItem(STORAGE_KEY_THEME);
    if (!stored) applyTheme(resolveTheme());
  });

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const nextTheme = resolveTheme() === "light" ? "dark" : "light";
      applyTheme(nextTheme);
      persistTheme(nextTheme);
    });
  }

  const storedModel = !isAnonymous ? window.localStorage.getItem(STORAGE_KEY_MODEL) : null;
  if (storedModel) {
    modelSelect.value = storedModel;
  }

  if (modelSelect) {
    modelSelect.addEventListener("change", () => {
      setItemGuarded(STORAGE_KEY_MODEL, modelSelect.value);
    });
  }

  function persistApiKey(key) {
    if (isAnonymous) {
      removeItem(STORAGE_KEY_API);
      return;
    }

    if (!rememberKeyCheckbox || !rememberKeyCheckbox.checked) {
      removeItem(STORAGE_KEY_API);
      return;
    }

    const password = masterPasswordInput ? masterPasswordInput.value.trim() : "";
    const payload = password
      ? { method: "xor", cipher: xorEncrypt(key, password) }
      : { method: "base64", cipher: base64Encode(key) };

    encryptedKeyPayload = payload;
    setItemGuarded(STORAGE_KEY_API, JSON.stringify(payload));
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener("change", () => {
      const key = sanitizeApiKey(apiKeyInput.value);
      apiKeyInput.value = key;
      if (!key) {
        clearModelOptions();
        removeItem(STORAGE_KEY_API);
        return;
      }
      persistApiKey(key);
      fetchAndPopulateModels(key);
    });
  }

  if (rememberKeyCheckbox) {
    rememberKeyCheckbox.addEventListener("change", () => {
      const key = sanitizeApiKey(apiKeyInput.value);
      apiKeyInput.value = key;
      if (!key) {
        removeItem(STORAGE_KEY_API);
        return;
      }
      if (rememberKeyCheckbox.checked) {
        persistApiKey(key);
      } else {
        removeItem(STORAGE_KEY_API);
      }
    });
  }

  if (masterPasswordInput) {
    masterPasswordInput.addEventListener("input", () => {
      if (!encryptedKeyPayload || encryptedKeyPayload.method !== "xor") return;
      if (apiKeyInput && !apiKeyInput.value && masterPasswordInput.value) {
        try {
          const key = xorDecrypt(encryptedKeyPayload.cipher, masterPasswordInput.value);
          apiKeyInput.value = key;
          fetchAndPopulateModels(key);
          statusEl.classList.remove("error");
          statusEl.textContent = "API key unlocked.";
        } catch (err) {
          console.error("masterPassword decrypt error", err);
        }
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
      updateEstimates();
    });
  }

  /* ---------- Reset localStorage ---------- */

  if (resetStorageBtn) {
    resetStorageBtn.addEventListener("click", () => {
      clearAppStorage();
      historyCache = [];
      renderHistory();
      apiKeyInput.value = "";
      if (masterPasswordInput) {
        masterPasswordInput.value = "";
      }
      if (rememberKeyCheckbox) {
        rememberKeyCheckbox.checked = false;
      }
    if (anonymousModeCheckbox) {
      anonymousModeCheckbox.checked = false;
      isAnonymous = false;
    }
    applyGenerationOptions(GENERATION_OPTIONS_DEFAULTS);
    statusEl.classList.remove("error", "loading");
    statusEl.textContent = "Local storage cleared.";

      clearModelOptions();

      if (onboarding) {
        onboarding.classList.remove("hidden");
      }
    });
  }

  /* ---------- Anonymous mode ---------- */

  function applyAnonymousMode(enabled) {
    isAnonymous = enabled;

    if (rememberKeyCheckbox) {
      rememberKeyCheckbox.checked = false;
      rememberKeyCheckbox.disabled = enabled;
    }
    if (masterPasswordInput) {
      masterPasswordInput.value = "";
      masterPasswordInput.disabled = enabled;
    }

    if (enabled) {
      clearAppStorage();
      historyCache = [];
      renderHistory();
      if (apiKeyInput) apiKeyInput.value = "";
      clearModelOptions();
      statusEl.textContent = "Anonymous mode enabled. Nothing will be saved.";
      statusEl.classList.remove("error", "loading");
      updateEstimates();
    } else {
      historyCache = loadHistoryFromStorage();
      renderHistory();
      hydrateApiKeyFromStorage();
      applyTheme(resolveTheme());
      persistGenerationOptions(generationOptions);
    }
  }

  if (anonymousModeCheckbox) {
    anonymousModeCheckbox.addEventListener("change", () => {
      applyAnonymousMode(anonymousModeCheckbox.checked);
    });
  }

  /* ---------- Expert mode ---------- */

  function setExpertMode(active) {
    if (!expertPanel) return;
    expertPanel.classList.toggle("hidden", !active);
  }

  if (expertToggle) {
    expertToggle.addEventListener("change", () => {
      setExpertMode(expertToggle.checked);
      updateEstimates();
    });
  }

  applyGenerationOptions(loadGenerationOptions());

  if (promptModeSelect) {
    promptModeSelect.addEventListener("change", syncGenerationOptionsFromUI);
  }

  if (tocCheckbox) {
    tocCheckbox.addEventListener("change", syncGenerationOptionsFromUI);
  }

  function openGenerationOptions() {
    if (!generationOptionsPanel || !generationOptionsBtn) return;
    generationOptionsPanel.classList.add("open");
    generationOptionsPanel.setAttribute("aria-hidden", "false");
    generationOptionsBtn.setAttribute("aria-expanded", "true");
  }

  function closeGenerationOptions() {
    if (!generationOptionsPanel || !generationOptionsBtn) return;
    generationOptionsPanel.classList.remove("open");
    generationOptionsPanel.setAttribute("aria-hidden", "true");
    generationOptionsBtn.setAttribute("aria-expanded", "false");
  }

  function toggleGenerationOptions() {
    if (!generationOptionsPanel || !generationOptionsBtn) return;
    if (generationOptionsPanel.classList.contains("open")) {
      closeGenerationOptions();
    } else {
      openGenerationOptions();
    }
  }

  if (generationOptionsBtn) {
    generationOptionsBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleGenerationOptions();
    });
  }

  document.addEventListener("click", (event) => {
    if (!generationOptionsPanel || !generationOptionsPanel.classList.contains("open")) return;
    if (generationOptionsPanel.contains(event.target)) return;
    if (generationOptionsBtn && generationOptionsBtn.contains(event.target)) return;
    closeGenerationOptions();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeGenerationOptions();
      closeExportMenu();
      closeExportModal();
      closeHistoryOverlay();
    }
  });

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

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function parseHeadings(markdown) {
    return markdown
      .split(/\n/)
      .map((line) => {
        const match = line.match(/^(#{1,6})\s+(.*)/);
        if (!match) return null;
        return { level: match[1].length, text: match[2].trim() };
      })
      .filter(Boolean);
  }

  function analyzeSeo(content, keyword) {
    const cleanContent = content || "";
    const keywordNormalized = (keyword || "").trim().toLowerCase();
    const words = cleanContent.match(/\b[\p{L}'-]+\b/gu) || [];
    const wordCount = words.length;
    const headings = parseHeadings(cleanContent);

    let score = 0;
    const checks = [];
    const suggestions = [];

    const h1 = headings.find((h) => h.level === 1);
    const h2 = headings.find((h) => h.level === 2);

    if (h1) {
      const hasKeyword = keywordNormalized && h1.text.toLowerCase().includes(keywordNormalized);
      score += hasKeyword ? 22 : 14;
      checks.push(`${hasKeyword ? "✅" : "⚠️"} Keyword in H1`);
      if (!hasKeyword && keywordNormalized) {
        suggestions.push("Add the main keyword to your H1.");
      }
    } else {
      suggestions.push("Add a clear H1 heading at the top.");
    }

    if (h2) {
      const hasKeywordH2 = keywordNormalized && h2.text.toLowerCase().includes(keywordNormalized);
      score += hasKeywordH2 ? 16 : 10;
      checks.push(`${hasKeywordH2 ? "✅" : "⚠️"} Keyword appears in an H2`);
      if (!hasKeywordH2 && keywordNormalized) {
        suggestions.push("Add the keyword to at least one H2.");
      }
    } else {
      suggestions.push("Add H2 subheadings to structure the article.");
    }

    const keywordCount = keywordNormalized
      ? (cleanContent.toLowerCase().match(new RegExp(`\\b${escapeRegex(keywordNormalized)}\\b`, "g")) || []).length
      : 0;
    const density = wordCount ? (keywordCount / wordCount) * 100 : 0;
    const idealDensity = 2;
    const densityScore = 26 - Math.min(20, Math.abs(density - idealDensity) * 4);
    score += Math.max(4, densityScore);
    checks.push(`ℹ️ Keyword density: ${density.toFixed(2)}% (${keywordCount} mentions)`);
    if (density < 1 && keywordNormalized) {
      suggestions.push("Increase keyword usage slightly (aim for ~1-3%).");
    } else if (density > 3.5) {
      suggestions.push("Reduce keyword repetition to avoid stuffing.");
    }

    const validHierarchy = (() => {
      if (!headings.length) return false;
      let lastLevel = headings[0].level;
      if (lastLevel !== 1) return false;
      for (let i = 1; i < headings.length; i++) {
        const level = headings[i].level;
        if (level - lastLevel > 1) return false;
        lastLevel = level;
      }
      return true;
    })();

    score += validHierarchy ? 16 : 6;
    checks.push(`${validHierarchy ? "✅" : "⚠️"} Heading hierarchy H1 > H2 > H3`);
    if (!validHierarchy) {
      suggestions.push("Reorder headings to follow H1 > H2 > H3 without skipping levels.");
    }

    const lengthScore = (() => {
      if (wordCount >= 800 && wordCount <= 2500) return 20;
      if (wordCount >= 600 && wordCount < 800) return 14;
      if (wordCount > 2500 && wordCount <= 3200) return 14;
      return 8;
    })();
    score += lengthScore;
    checks.push(`ℹ️ Length: ${wordCount} words`);
    if (wordCount < 800) {
      suggestions.push("Expand the article to reach at least 800 words.");
    } else if (wordCount > 3000) {
      suggestions.push("Trim or split very long sections to stay concise.");
    }

    return {
      score: Math.min(100, Math.max(0, Math.round(score))),
      checks,
      suggestions,
      density,
      wordCount
    };
  }

  function splitSentences(text) {
    return (text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function countSyllables(word) {
    const normalized = (word || "").toLowerCase();
    const parts = normalized.match(/[aeiouyàâäáãåæçéèêëíìîïïòóôöõœùúûü]+/gi);
    return parts ? Math.max(1, parts.length) : 1;
  }

  function computeReadability(content, language) {
    const sentences = splitSentences(content);
    const words = (content.match(/\b[\p{L}'-]+\b/gu) || []).map((w) => w.trim());
    const wordCount = words.length || 1;
    const sentenceCount = sentences.length || 1;
    const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);

    const wordsPerSentence = wordCount / sentenceCount;
    const syllablesPerWord = syllables / wordCount;
    const isFrench = (language || "").toLowerCase().includes("french");

    const score = isFrench
      ? 207 - 1.015 * wordsPerSentence - 73.6 * syllablesPerWord
      : 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;

    const complexSentences = sentences.filter((s) => s.split(/\s+/).filter(Boolean).length > 25);

    return {
      score: Math.round(score),
      averageSentenceLength: Math.round(wordsPerSentence * 10) / 10,
      complexSentences
    };
  }

  function getSelectedLanguage() {
    const config = getLanguageConfig(languageSelect ? languageSelect.value : DEFAULT_LANGUAGE);
    if (languageSelect) {
      languageSelect.value = config.code;
    }
    return config;
  }

  function renderInsightList(element, items, emptyText) {
    if (!element) return;
    element.innerHTML = "";
    if (!items || !items.length) {
      const li = document.createElement("li");
      li.textContent = emptyText || "No data yet.";
      element.appendChild(li);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      element.appendChild(li);
    });
  }

  function highlightComplexSentences(sentences) {
    if (!previewEl) return;
    previewEl.querySelectorAll(".complex-sentence").forEach((mark) => {
      const textNode = document.createTextNode(mark.textContent);
      mark.replaceWith(textNode);
    });

    const targets = (sentences || []).filter(Boolean);
    if (!targets.length) return;

    const walker = document.createTreeWalker(previewEl, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode() && targets.length) {
      const node = walker.currentNode;
      const text = node.textContent;
      if (!text || !text.trim()) continue;

      const lower = text.toLowerCase();
      const foundIndex = targets.findIndex((sentence) => lower.includes(sentence.toLowerCase()));
      if (foundIndex === -1) continue;

      const sentence = targets[foundIndex];
      const idx = lower.indexOf(sentence.toLowerCase());
      const before = text.slice(0, idx);
      const match = text.slice(idx, idx + sentence.length);
      const after = text.slice(idx + sentence.length);

      const fragment = document.createDocumentFragment();
      if (before) fragment.appendChild(document.createTextNode(before));
      const mark = document.createElement("mark");
      mark.className = "complex-sentence";
      mark.textContent = match;
      fragment.appendChild(mark);
      if (after) fragment.appendChild(document.createTextNode(after));

      node.parentNode.replaceChild(fragment, node);
      targets.splice(foundIndex, 1);
    }
  }

  function updateInsights() {
    const content = outputArea ? outputArea.value : "";
    const keyword = keywordInput ? keywordInput.value : "";
    const languageConfig = getSelectedLanguage();

    const seo = analyzeSeo(content, keyword);
    if (seoScoreValue) seoScoreValue.textContent = Number.isFinite(seo.score) ? seo.score : "—";
    if (seoScoreBar) {
      seoScoreBar.style.width = `${seo.score}%`;
    }
    renderInsightList(seoChecksList, seo.checks, "Start writing to see checks.");
    renderInsightList(seoSuggestionsList, seo.suggestions, "No suggestions — looking good!");

    const readability = computeReadability(content, languageConfig.promptName);
    if (readabilityScoreEl) {
      readabilityScoreEl.textContent = Number.isFinite(readability.score) ? readability.score : "—";
    }
    if (averageSentenceLengthEl) {
      averageSentenceLengthEl.textContent = `${readability.averageSentenceLength || 0} words`;
    }
    renderInsightList(
      complexSentencesList,
      readability.complexSentences,
      "No complex sentences detected."
    );
    highlightComplexSentences(readability.complexSentences);
  }

  function estimateTokens() {
    const lengthLabel = lengthSelect ? lengthSelect.value.toLowerCase() : "";
    const lengthMap = {
      short: 1100,
      standard: 1900,
      long: 2600,
      ultra: 3200
    };
    const base = Object.entries(lengthMap).find(([key]) => lengthLabel.includes(key));
    const planLines = planEditor ? planEditor.value.split(/\n/).filter(Boolean).length : 0;
    const bonus = planLines * 25;
    const tokens = (base ? lengthMap[base[0]] : 1800) + bonus;
    return Math.max(600, Math.min(tokens, maxTokensInput ? Number(maxTokensInput.value) || tokens : tokens));
  }

  function priceForModel(model) {
    if (!model) return MODEL_PRICING.default;
    return MODEL_PRICING[model] || MODEL_PRICING.default;
  }

  function recordCost(model, tokens) {
    const pricing = priceForModel(model);
    let cost = 0;
    if (pricing.prompt) {
      cost = (tokens / 1000) * (pricing.prompt + pricing.completion);
    }

    if (cost > 0) {
      const current = loadMonthlySpend();
      const next = current + cost;
      persistMonthlySpend(next);
    }

    return cost;
  }

  function updateEstimates() {
    if (!tokenEstimateEl || !costEstimateEl) return;
    const tokens = estimateTokens();
    tokenEstimateEl.textContent = `${tokens.toLocaleString()} tok.`;

    const model = modelSelect ? modelSelect.value : "";
    const pricing = priceForModel(model);
    const cost = pricing.prompt
      ? (tokens / 1000) * (pricing.prompt + pricing.completion)
      : 0;
    costEstimateEl.textContent = cost ? `$${cost.toFixed(3)}` : "—";

    if (monthlySpendEl) {
      const spend = loadMonthlySpend();
      monthlySpendEl.textContent = `$${spend.toFixed(2)}`;
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
      updateInsights();
    });
    updateMetrics();
    renderPreview(outputArea.value);
    updateInsights();
  }

  [keywordInput, lengthSelect, languageSelect, toneSelect, extraInput].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", () => {
      updateEstimates();
      updateInsights();
    });
    el.addEventListener("input", () => {
      updateEstimates();
      updateInsights();
    });
  });

  if (planEditor) {
    planEditor.addEventListener("input", updateEstimates);
  }

  [modelSelect, temperatureInput, maxTokensInput, topPInput].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", updateEstimates);
  });

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

    const sanitizedKey = sanitizeApiKey(apiKey);
    if (!sanitizedKey) {
      statusEl.textContent = "Please provide a valid OpenRouter API key.";
      statusEl.classList.add("error");
      clearModelOptions();
      return;
    }

    modelSelect.disabled = true;
    statusEl.classList.remove("error");
    statusEl.classList.add("loading");
    statusEl.textContent = "Loading models from OpenRouter...";

    try {
      const response = await fetch(OPENROUTER_MODELS_URL, {
        headers: {
          Authorization: `Bearer ${sanitizedKey}`
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
      removeItem(STORAGE_KEY_MODEL);
      return;
    }

    const storedModel = !isAnonymous ? window.localStorage.getItem(STORAGE_KEY_MODEL) : null;
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
      setItemGuarded(STORAGE_KEY_MODEL, sortedModels[0].id);
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
    removeItem(STORAGE_KEY_MODEL);
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

  /* ---------- Export Markdown ---------- */

  function slugifyKeyword(value) {
    const base = (value || "").trim().toLowerCase();
    if (!base) return "article";
    const normalized = base
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");
    const slug = normalized
      .replace(/[^a-z0-9\\s-]/g, " ")
      .trim()
      .replace(/\\s+/g, "-")
      .replace(/-+/g, "-");
    return slug || "article";
  }

  function getMarkdownFilename() {
    const keyword = keywordInput ? keywordInput.value : "";
    const slug = slugifyKeyword(keyword);
    const today = new Date().toISOString().slice(0, 10);
    return `${slug}-${today}.md`;
  }

  function downloadMarkdown() {
    if (!outputArea) return;
    const text = outputArea.value;
    statusEl.classList.remove("error", "loading");
    if (!text || !text.trim()) {
      statusEl.textContent = "Nothing to export yet. Generate content first.";
      statusEl.classList.add("error");
      return;
    }
    const filename = getMarkdownFilename();
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    statusEl.textContent = `Downloaded ${filename}.`;
  }

  function openExportMenu() {
    if (!exportMenu || !exportToggleBtn) return;
    exportMenu.classList.add("open");
    exportMenu.setAttribute("aria-hidden", "false");
    exportToggleBtn.setAttribute("aria-expanded", "true");
  }

  function closeExportMenu() {
    if (!exportMenu || !exportToggleBtn) return;
    exportMenu.classList.remove("open");
    exportMenu.setAttribute("aria-hidden", "true");
    exportToggleBtn.setAttribute("aria-expanded", "false");
  }

  function toggleExportMenu() {
    if (!exportMenu || !exportToggleBtn) return;
    if (exportMenu.classList.contains("open")) {
      closeExportMenu();
    } else {
      openExportMenu();
    }
  }

  function openExportModal(platform) {
    if (!exportModal || !exportModalTitle || !exportModalSubtitle || !exportModalBody) return;
    const isGhost = platform === "ghost";
    exportModalTitle.textContent = isGhost ? "Send to Ghost" : "Send to WordPress";
    exportModalSubtitle.textContent = "Coming soon";
    const fields = isGhost
      ? ["Ghost Admin API URL", "Ghost Admin API key"]
      : ["Site URL", "Application password"];
    exportModalBody.innerHTML = `
      <p class="small-note">Required fields for future integration:</p>
      <ul class="modal-list">
        ${fields.map((field) => `<li>${field}</li>`).join("")}
      </ul>
    `;
    exportModal.classList.add("open");
    exportModal.setAttribute("aria-hidden", "false");
  }

  function closeExportModal() {
    if (!exportModal) return;
    exportModal.classList.remove("open");
    exportModal.setAttribute("aria-hidden", "true");
  }

  if (exportToggleBtn) {
    exportToggleBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleExportMenu();
    });
  }

  if (exportMenu) {
    exportMenu.addEventListener("click", (event) => {
      const item = event.target.closest(".export-menu-item");
      if (!item) return;
      const action = item.dataset.exportAction;
      closeExportMenu();
      if (action === "download") {
        downloadMarkdown();
      } else if (action === "ghost" || action === "wordpress") {
        openExportModal(action);
      }
    });
  }

  if (closeExportModalBtn) {
    closeExportModalBtn.addEventListener("click", closeExportModal);
  }

  if (exportModal) {
    exportModal.addEventListener("click", (event) => {
      if (event.target === exportModal) {
        closeExportModal();
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (!exportMenu || !exportMenu.classList.contains("open")) return;
    if (exportMenu.contains(event.target)) return;
    if (exportToggleBtn && exportToggleBtn.contains(event.target)) return;
    closeExportMenu();
  });

  /* ---------- Clear output ---------- */

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      outputArea.value = "";
      statusEl.textContent = "";
      statusEl.classList.remove("error", "loading");
      updateMetrics();
      renderPreview("");
      updateInsights();
    });
  }

  /* ---------- History overlay ---------- */

  function openHistoryOverlay() {
    if (!historyOverlay) return;
    historyOverlay.classList.add("open");
    historyOverlay.setAttribute("aria-hidden", "false");
    renderHistory(historySearch ? historySearch.value : "");
    if (historySearch) {
      historySearch.focus();
    }
  }

  function closeHistoryOverlay() {
    if (!historyOverlay) return;
    historyOverlay.classList.remove("open");
    historyOverlay.setAttribute("aria-hidden", "true");
  }

  if (openHistoryBtn) {
    openHistoryBtn.addEventListener("click", openHistoryOverlay);
  }

  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener("click", closeHistoryOverlay);
  }

  if (historyOverlay) {
    historyOverlay.addEventListener("click", (event) => {
      if (event.target === historyOverlay) {
        closeHistoryOverlay();
      }
    });
  }

  if (historySearch) {
    historySearch.addEventListener("input", () => {
      renderHistory(historySearch.value);
    });
  }

  if (historyList) {
    historyList.addEventListener("click", (event) => {
      const item = event.target.closest(".history-item");
      if (!item) return;
      const entry = historyCache.find((h) => h.id === item.dataset.id);
      if (!entry) return;
      outputArea.value = entry.content || "";
      updateMetrics();
      renderPreview(entry.content || "");
      updateInsights();
      statusEl.textContent = `Loaded “${entry.title}” from history.`;
      statusEl.classList.remove("error", "loading");
      closeHistoryOverlay();
    });
  }

  /* ---------- Config import/export ---------- */

  function buildConfigSnapshot() {
    // v0.9.3 settings export focuses on global preferences only.
    return {
      version: "0.9.3",
      preferences: {
        theme: resolveTheme(),
        model: modelSelect ? modelSelect.value : "",
        preset: presetSelect ? presetSelect.value : "",
        anonymousMode: !!(anonymousModeCheckbox && anonymousModeCheckbox.checked),
        expertMode: !!(expertToggle && expertToggle.checked),
        temperature: temperatureInput ? Number(temperatureInput.value) : 0.7,
        maxTokens: maxTokensInput ? Number(maxTokensInput.value) : 2048,
        topP: topPInput ? Number(topPInput.value) : 1
      },
      history: historyCache
    };
  }

  function applyImportedConfig(config) {
    if (!config || typeof config !== "object") return;
    const prefs = config.preferences || {};

    if (typeof prefs.anonymousMode === "boolean" && anonymousModeCheckbox) {
      anonymousModeCheckbox.checked = prefs.anonymousMode;
      applyAnonymousMode(prefs.anonymousMode);
    }

    if (presetSelect && prefs.preset !== undefined) presetSelect.value = prefs.preset;
    if (expertToggle && typeof prefs.expertMode === "boolean") {
      expertToggle.checked = prefs.expertMode;
      setExpertMode(prefs.expertMode);
    }
    if (temperatureInput && prefs.temperature !== undefined) temperatureInput.value = prefs.temperature;
    if (maxTokensInput && prefs.maxTokens !== undefined) maxTokensInput.value = prefs.maxTokens;
    if (topPInput && prefs.topP !== undefined) topPInput.value = prefs.topP;

    if (prefs.theme) {
      applyTheme(prefs.theme);
      persistTheme(prefs.theme);
    }

    if (modelSelect && prefs.model) {
      modelSelect.value = prefs.model;
    }

    if (Array.isArray(config.history)) {
      historyCache = config.history.slice(0, MAX_HISTORY_ITEMS);
      persistHistory();
      renderHistory(historySearch ? historySearch.value : "");
    }

    statusEl.textContent = "Configuration imported.";
    statusEl.classList.remove("error", "loading");
  }

  if (exportConfigBtn) {
    exportConfigBtn.addEventListener("click", () => {
      try {
        const snapshot = buildConfigSnapshot();
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "openseo-config.json";
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("export config error", err);
        statusEl.textContent = "Could not export configuration.";
        statusEl.classList.add("error");
      }
    });
  }

  if (importConfigBtn && importConfigInput) {
    importConfigBtn.addEventListener("click", () => {
      importConfigInput.click();
    });

    importConfigInput.addEventListener("change", async () => {
      const file = importConfigInput.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        applyImportedConfig(parsed);
      } catch (err) {
        console.error("import config error", err);
        statusEl.textContent = "Invalid configuration file.";
        statusEl.classList.add("error");
      } finally {
        importConfigInput.value = "";
      }
    });
  }

  if (expertToggle) {
    setExpertMode(expertToggle.checked);
  }
  updateEstimates();

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

  async function callChat(body, apiKey) {
    const sanitizedKey = sanitizeApiKey(apiKey);
    if (!sanitizedKey) {
      throw new Error("Invalid API key.");
    }
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sanitizedKey}`,
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
        // noop
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

    return content;
  }

  /* ---------- Generate article ---------- */

  function markStep(activeStep) {
    const steps = [stepPlan, stepReview, stepGenerate];
    steps.forEach((step, idx) => {
      if (!step) return;
      const current = idx === activeStep;
      const done = idx < activeStep;
      step.classList.toggle("active", current);
      step.classList.toggle("done", done);
    });
  }

  async function generatePlan({ silent } = {}) {
    const apiKey = sanitizeApiKey(apiKeyInput.value);
    apiKeyInput.value = apiKey;
    const model = modelSelect.value;
    if (!apiKey || !model) {
      if (!silent) {
        statusEl.textContent = "Please provide API key and model before generating a plan.";
        statusEl.classList.add("error");
      }
      return null;
    }

    const keyword = keywordInput.value.trim();
    if (!keyword) {
      if (!silent) {
        statusEl.textContent = "Please enter a main keyword.";
        statusEl.classList.add("error");
      }
      return null;
    }

    markStep(0);
    statusEl.textContent = "Generating outline...";
    statusEl.classList.add("loading");
    const length = lengthSelect.value;
    const languageConfig = getSelectedLanguage();

    const body = {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an SEO content strategist. Return a concise Markdown outline only (H1/H2/H3) with no extra prose."
        },
        {
          role: "user",
          content: `Keyword: ${keyword}. Tone: ${toneSelect.value}. Language: ${languageConfig.promptName}. Length: ${length}. Outline only.`
        }
      ]
    };

    const temperature = expertToggle && expertToggle.checked ? Number(temperatureInput.value) || 0.7 : 0.5;
    const maxTokens = expertToggle && expertToggle.checked ? Number(maxTokensInput.value) || 512 : 512;
    const top_p = expertToggle && expertToggle.checked ? Number(topPInput.value) || 1 : 1;
    const frequency_penalty =
      expertToggle && expertToggle.checked && frequencyPenaltyInput
        ? Number(frequencyPenaltyInput.value) || 0
        : 0;

    Object.assign(body, { temperature, max_tokens: maxTokens, top_p, frequency_penalty });

    let endProgress;
    try {
      planBtn.disabled = true;
      regeneratePlanBtn.disabled = true;
      endProgress = startProgress(length);
      const content = await callChat(body, apiKey);
      planEditor.value = content.trim();
      markStep(1);
      statusEl.textContent = "Plan ready. Review or edit before generating.";
      statusEl.classList.remove("error");
      statusEl.classList.remove("loading");
      recordCost(model, 400);
      updateEstimates();
      return content;
    } catch (err) {
      console.error(err);
      statusEl.textContent = `Error while generating plan: ${err.message}`;
      statusEl.classList.add("error");
      statusEl.classList.remove("loading");
      return null;
    } finally {
      if (endProgress) endProgress(!statusEl.classList.contains("error"));
      planBtn.disabled = false;
      regeneratePlanBtn.disabled = false;
    }
  }

  if (planBtn) {
    planBtn.addEventListener("click", () => generatePlan());
  }

  if (regeneratePlanBtn) {
    regeneratePlanBtn.addEventListener("click", () => generatePlan());
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      statusEl.textContent = "";
      statusEl.classList.remove("error", "loading");

      const apiKey = sanitizeApiKey(apiKeyInput.value);
      apiKeyInput.value = apiKey;
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

      if (planEditor && !planEditor.value.trim()) {
        await generatePlan({ silent: true });
      }

      const languageConfig = getSelectedLanguage();
      const tone = toneSelect.value;
      const length = lengthSelect.value;
      const extra = extraInput.value.trim();
      const model = modelSelect.value;
      const mode = promptModeSelect ? promptModeSelect.value : "standard";

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
        persistApiKey(apiKey);
      } else {
        removeItem(STORAGE_KEY_API);
      }

      const userPrompt = buildUserPrompt({
        keyword,
        languageConfig,
        tone,
        length,
        extra,
        planText: planEditor ? planEditor.value : ""
      });

      const temperature = expertToggle && expertToggle.checked ? Number(temperatureInput.value) || 0.7 : 0.7;
      const maxTokens = expertToggle && expertToggle.checked ? Number(maxTokensInput.value) || undefined : undefined;
      const top_p = expertToggle && expertToggle.checked ? Number(topPInput.value) || 1 : 1;
      const frequency_penalty =
        expertToggle && expertToggle.checked && frequencyPenaltyInput
          ? Number(frequencyPenaltyInput.value) || 0
          : 0;

      const body = {
        model,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature,
        top_p,
        frequency_penalty
      };

      if (maxTokens) {
        body.max_tokens = maxTokens;
      }

      let endProgress;
      try {
        generateBtn.disabled = true;
        generateBtn.textContent = "Generating...";

        markStep(2);

        const tocEnabled = mode === "strict-seo" || (tocCheckbox && tocCheckbox.checked);

        if (tocEnabled) {
          statusEl.textContent = "TOC enabled. Contacting OpenRouter...";
        } else {
          statusEl.textContent = "Contacting OpenRouter...";
        }
        statusEl.classList.add("loading");
        statusEl.classList.remove("error");

        endProgress = startProgress(length);
        statusEl.textContent = `${statusEl.textContent} ETA ${etaLabel ? etaLabel.textContent : "~"}`;

        const content = await callChat(body, apiKey);

        outputArea.value = content;
        updateMetrics();
        renderPreview(content);
        updateInsights();
        addHistoryEntry({ content, keyword });
        statusEl.textContent = "Article generated. You can now copy the Markdown.";
        statusEl.classList.remove("loading");

        recordCost(model, estimateTokens());
        updateEstimates();

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

  /* ---------- Metadata generation ---------- */

  function parseMetadataResponse(raw) {
    if (!raw) return {};

    const trimmed = raw.trim();

    const jsonFenceMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
    const fencedFallback = jsonFenceMatch ? jsonFenceMatch[1].trim() : null;
    const jsonLikeMatch = trimmed.match(/\{[\s\S]*\}/);
    const jsonCandidate = fencedFallback || jsonLikeMatch?.[0] || trimmed;

    try {
      const parsed = JSON.parse(jsonCandidate);
      return {
        seo_title: parsed.seo_title || parsed.title || parsed.seoTitle,
        meta_description: parsed.meta_description || parsed.description || parsed.metaDescription,
        secondary_keywords: parsed.secondary_keywords || parsed.keywords || parsed.secondaryKeywords
      };
    } catch (err) {
      const titleMatch = trimmed.match(/title[:\-]\s*(.+)/i);
      const descriptionMatch = trimmed.match(/description[:\-]\s*(.+)/i);
      const keywordsMatch = trimmed.match(/keywords?[:\-]\s*(.+)/i);
      return {
        seo_title: titleMatch ? titleMatch[1].trim() : "",
        meta_description: descriptionMatch ? descriptionMatch[1].trim() : "",
        secondary_keywords: keywordsMatch ? keywordsMatch[1].trim() : ""
      };
    }
  }

  function renderMetadata(metadata) {
    if (!metadata) return;
    if (seoTitleText) {
      seoTitleText.textContent = metadata.seo_title || "Awaiting title";
    }
    if (metaDescriptionText) {
      metaDescriptionText.textContent = metadata.meta_description || "Awaiting description";
    }
    if (secondaryKeywordsText) {
      const value = Array.isArray(metadata.secondary_keywords)
        ? metadata.secondary_keywords.join(", ")
        : metadata.secondary_keywords || "";
      secondaryKeywordsText.textContent = value || "Awaiting keywords";
    }
  }

  async function generateMetadata() {
    statusEl.textContent = "";
    statusEl.classList.remove("error", "loading");

    const apiKey = sanitizeApiKey(apiKeyInput.value);
    apiKeyInput.value = apiKey;
    if (!apiKey) {
      statusEl.textContent = "Please provide your OpenRouter API key in the settings menu.";
      statusEl.classList.add("error");
      return;
    }

    const keyword = keywordInput.value.trim();
    if (!keyword) {
      statusEl.textContent = "Please enter a main keyword.";
      statusEl.classList.add("error");
      keywordInput.focus();
      return;
    }

    const model = modelSelect.value;
    if (!model) {
      statusEl.textContent = "Please select a model before generating metadata.";
      statusEl.classList.add("error");
      return;
    }

    const languageConfig = getSelectedLanguage();
    const articleContext = (outputArea ? outputArea.value : "").slice(0, 6000) || "(no draft content provided)";

    const body = {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an SEO metadata assistant. Respond in JSON with keys: seo_title (<=60 chars), meta_description (<=160 chars, clickable), secondary_keywords (comma-separated)."
        },
        {
          role: "user",
          content: `Language: ${languageConfig.promptName}. Main keyword: ${keyword}.\nContext (may be partial):\n${articleContext}`
        }
      ],
      temperature: 0.5,
      top_p: 1,
      frequency_penalty: 0
    };

    let endProgress;
    try {
      if (generateMetadataBtn) {
        generateMetadataBtn.disabled = true;
        generateMetadataBtn.textContent = "Generating metadata...";
      }
      statusEl.textContent = "Generating SEO metadata...";
      statusEl.classList.remove("error");
      statusEl.classList.add("loading");

      endProgress = startProgress("short");
      const raw = await callChat(body, apiKey);
      const metadata = parseMetadataResponse(raw);
      renderMetadata(metadata);
      statusEl.textContent = "Metadata ready.";
      statusEl.classList.remove("loading");
      recordCost(model, 300);
      updateEstimates();
    } catch (err) {
      console.error(err);
      statusEl.textContent = `Error generating metadata: ${err.message}`;
      statusEl.classList.add("error");
      statusEl.classList.remove("loading");
    } finally {
      if (endProgress) endProgress(!statusEl.classList.contains("error"));
      if (generateMetadataBtn) {
        generateMetadataBtn.disabled = false;
        generateMetadataBtn.textContent = "Generate SEO metadata";
      }
    }
  }

  if (generateMetadataBtn) {
    generateMetadataBtn.addEventListener("click", generateMetadata);
  }

  /* ---------- Selection regeneration ---------- */

  async function regenerateSelection({ changeTone = false } = {}) {
    if (!outputArea) return;
    const apiKey = sanitizeApiKey(apiKeyInput.value);
    apiKeyInput.value = apiKey;
    if (!apiKey) {
      statusEl.textContent = "API key required to regenerate.";
      statusEl.classList.add("error");
      return;
    }

    const start = outputArea.selectionStart;
    const end = outputArea.selectionEnd;
    if (start === end) {
      statusEl.textContent = "Select a passage in the editor first.";
      statusEl.classList.add("error");
      return;
    }

    const selected = outputArea.value.slice(start, end).trim();
    if (!selected) {
      statusEl.textContent = "Empty selection.";
      statusEl.classList.add("error");
      return;
    }

    const contextAround = outputArea.value.slice(Math.max(0, start - 240), Math.min(outputArea.value.length, end + 240));
    const tone = toneSelect ? toneSelect.value : "";

    const temperature = expertToggle && expertToggle.checked ? Number(temperatureInput.value) || 0.7 : 0.7;
    const maxTokens = expertToggle && expertToggle.checked ? Number(maxTokensInput.value) || 512 : 512;
    const top_p = expertToggle && expertToggle.checked ? Number(topPInput.value) || 1 : 1;
    const frequency_penalty =
      expertToggle && expertToggle.checked && frequencyPenaltyInput
        ? Number(frequencyPenaltyInput.value) || 0
        : 0;

    const prompt = changeTone
      ? `Rewrite the following excerpt to match this tone: ${tone}. Keep the meaning and Markdown structure. Excerpt: ${selected}`
      : `Improve and regenerate the selected excerpt, keeping the same meaning and Markdown hierarchy. Excerpt: ${selected}\nContext: ${contextAround}`;

    const body = {
      model: modelSelect.value,
      messages: [
        { role: "system", content: "You rewrite Markdown excerpts while keeping structure intact." },
        { role: "user", content: prompt }
      ],
      temperature,
      top_p,
      frequency_penalty,
      max_tokens: maxTokens
    };

    try {
      statusEl.textContent = "Regenerating selection...";
      statusEl.classList.remove("error");
      statusEl.classList.add("loading");
      const replacement = await callChat(body, apiKey);
      const newValue = `${outputArea.value.slice(0, start)}${replacement.trim()}${outputArea.value.slice(end)}`;
      outputArea.value = newValue;
      updateMetrics();
      renderPreview(newValue);
      updateInsights();
      statusEl.textContent = "Selection updated.";
      statusEl.classList.remove("loading");
      recordCost(modelSelect.value, Math.min(maxTokens, 400));
      updateEstimates();
    } catch (err) {
      console.error(err);
      statusEl.textContent = `Error during selection regeneration: ${err.message}`;
      statusEl.classList.add("error");
      statusEl.classList.remove("loading");
    }
  }

  if (regenSelectionBtn) {
    regenSelectionBtn.addEventListener("click", () => regenerateSelection());
  }

  if (toneSelectionBtn) {
    toneSelectionBtn.addEventListener("click", () => regenerateSelection({ changeTone: true }));
  }

  /* ---------- Service worker ---------- */

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("Service worker registration failed", err));
  }
});

/* ---------- Prompt helpers ---------- */

const PROMPT_BLOCKS = {
  BASE_INVARIANTS: [
    "Output strictly in Markdown (no HTML, no YAML front matter).",
    "Use Markdown headings, lists, and tables when useful.",
    "Do not add YAML front matter.",
    "Avoid raw HTML.",
    "Do not use emojis.",
    "Avoid generic, overused AI-style introductions."
  ],
  ROLE_DEFINITION: [
    "You are a senior SEO content writer.",
    "You write long-form, well-structured, readable blog posts that follow on-page SEO best practices."
  ],
  STRUCTURE_CORE: [
    "Start with a strong, useful H1 title.",
    "Write a short and direct introduction.",
    "Use a clear heading hierarchy (H2, H3, H4 if necessary) that reflects a solid SEO structure.",
    "End with a conclusion that summarises the key points and suggests a concrete next step."
  ],
  STRUCTURE_EXTENDED: {
    TOC:
      "At the beginning of the article, add a Markdown table of contents with internal links to the main sections.",
    FAQ: "Add a concise FAQ section with clear questions and brief answers relevant to the topic.",
    CALLOUTS: "Use brief callouts (Tip:, Note:, Warning:) when they clarify key takeaways or cautions."
  },
  SEO_EXTRAS: [
    "Add an SEO metadata block with a concise title tag and meta description formatted in Markdown.",
    "Suggest relevant tags or categories when useful."
  ],
  WRITING_GUIDELINES: [
    "Use short paragraphs and clear sentences.",
    "Use bullet lists or numbered lists when useful.",
    "Add a table in Markdown if it helps compare options, steps, tools or features.",
    "Keep paragraphs tight and focused."
  ]
};

function buildSystemPrompt() {
  return [...PROMPT_BLOCKS.ROLE_DEFINITION, ...PROMPT_BLOCKS.BASE_INVARIANTS].join(" ");
}

function buildPromptBlocks({
  keyword,
  languageConfig,
  tone,
  length,
  extra,
  planText,
  mode,
  tocRequested
}) {
  const lines = [];

  const resolvedLanguage = languageConfig || getLanguageConfig();
  const languageName = resolvedLanguage.promptName;

  lines.push(
    `Write a long-form SEO-optimized blog post in ${languageName}.`,
    `The entire article must be written exclusively in ${languageName}. Do not mix languages. Do not translate terms unless commonly used in ${languageName} SEO.`,
    `Main keyword: "${keyword}".`,
    `Tone: ${tone}.`,
    `Target length: ${length}.`,
    ""
  );

  if (resolvedLanguage.seoNotes) {
    lines.push(`Language-specific notes: ${resolvedLanguage.seoNotes}`);
    lines.push("");
  }

  if (NON_LATIN_LANGUAGE_CODES.has(resolvedLanguage.code)) {
    lines.push(
      "Preserve the Markdown heading and list structure exactly while writing naturally in the target language.",
      "Do not force Western punctuation or idioms; avoid English leftovers unless they are standard in the target language."
    );
    lines.push("");
  }

  lines.push("Base rules:");
  PROMPT_BLOCKS.BASE_INVARIANTS.forEach((rule) => lines.push(`- ${rule}`));
  lines.push("");

  lines.push("Structure (core):");
  PROMPT_BLOCKS.STRUCTURE_CORE.forEach((rule) => lines.push(`- ${rule}`));
  lines.push("");

  if (planText) {
    lines.push("Use the following outline and generate each section sequentially:");
    lines.push(planText);
    lines.push("Expand each heading with detailed, concise paragraphs.");
    lines.push("");
  }

  if (mode !== "minimal") {
    lines.push("Writing guidelines:");
    PROMPT_BLOCKS.WRITING_GUIDELINES.forEach((rule) => lines.push(`- ${rule}`));
    lines.push("");
  }

  if (mode === "standard") {
    if (tocRequested) {
      lines.push(PROMPT_BLOCKS.STRUCTURE_EXTENDED.TOC);
    }
    lines.push("If relevant to the topic, add a short FAQ section with concise answers.");
    lines.push("");
  }

  if (mode === "strict-seo") {
    lines.push("Extended structure:");
    lines.push(`- ${PROMPT_BLOCKS.STRUCTURE_EXTENDED.TOC}`);
    lines.push(`- ${PROMPT_BLOCKS.STRUCTURE_EXTENDED.CALLOUTS}`);
    lines.push(`- ${PROMPT_BLOCKS.STRUCTURE_EXTENDED.FAQ}`);
    lines.push("");

    lines.push("SEO extras:");
    PROMPT_BLOCKS.SEO_EXTRAS.forEach((rule) => lines.push(`- ${rule}`));
    lines.push("");
  }

  if (extra) {
    lines.push(`Additional options or constraints: ${extra}`);
  }

  return lines.join("\n");
}

/**
 * Build the user prompt for the SEO article generator.
 */
function buildUserPrompt({ keyword, languageConfig, tone, length, extra, planText }) {
  const promptModeSelect = document.getElementById("promptMode");
  const tocCheckbox = document.getElementById("tocCheckbox");
  const mode = promptModeSelect ? promptModeSelect.value : "standard";

  return buildPromptBlocks({
    keyword,
    languageConfig,
    tone,
    length,
    extra,
    planText,
    mode,
    tocRequested: Boolean(tocCheckbox && tocCheckbox.checked)
  });
}
