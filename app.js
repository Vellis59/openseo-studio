const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

const CHAT_PROVIDERS = {
  openrouter: "openrouter",
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  ollama: "ollama"
};

// Curated model ids (kept small on purpose so the app stays simple).
const CURATED_MODELS = {
  openai: [
    { id: "gpt-4.1-mini", label: "gpt-4.1-mini" },
    { id: "gpt-4o-mini", label: "gpt-4o-mini" },
    { id: "gpt-4o", label: "gpt-4o" }
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet" },
    { id: "claude-3-5-haiku-20241022", label: "claude-3-5-haiku" },
    { id: "claude-3-opus-20240229", label: "claude-3-opus" }
  ],
  gemini: [
    { id: "gemini-1.5-flash", label: "gemini-1.5-flash" },
    { id: "gemini-1.5-pro", label: "gemini-1.5-pro" },
    { id: "gemini-2.0-flash", label: "gemini-2.0-flash" }
  ],
  // Ollama models are discovered dynamically via /api/tags.
  // (We keep no curated list here on purpose.)
  ollama: []
};

const SW_DEBUG_PARAM = "debugSW";
const SW_RESET_PARAM = "resetSW";

function getServiceWorkerFlags() {
  const params = new URLSearchParams(window.location.search);
  return {
    shouldDebug: params.has(SW_DEBUG_PARAM),
    shouldReset: params.has(SW_RESET_PARAM)
  };
}

async function logServiceWorkerStatus() {
  const controller = navigator.serviceWorker.controller;
  const registrations = await navigator.serviceWorker.getRegistrations();
  console.info("[SW debug] controller:", controller);
  console.info("[SW debug] registrations:", registrations);
}

async function resetServiceWorkersAndCaches() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  }

  console.info("[SW reset] Unregistered service workers and cleared caches.");
}

function setupServiceWorkerTools() {
  const { shouldDebug, shouldReset } = getServiceWorkerFlags();
  if (!shouldDebug && !shouldReset) return;

  window.addEventListener("load", () => {
    if (!("serviceWorker" in navigator)) {
      console.info("[SW debug] Service workers are not supported in this browser.");
      return;
    }

    const tasks = [];
    if (shouldReset) tasks.push(resetServiceWorkersAndCaches());
    if (shouldDebug) tasks.push(logServiceWorkerStatus());
    Promise.all(tasks).catch((error) => {
      console.info("[SW debug] Service worker check failed:", error);
    });
  });
}

setupServiceWorkerTools();

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

  const providerSelect = document.getElementById("providerSelect");
  const apiKeyLabelText = document.getElementById("apiKeyLabelText");
  const apiKeyHelpText = document.getElementById("apiKeyHelpText");
  const modelHelpText = document.getElementById("modelHelpText");
  const ollamaBaseUrlRow = document.getElementById("ollamaBaseUrlRow");
  const ollamaBaseUrlInput = document.getElementById("ollamaBaseUrl");

  const useApiGatewayCheckbox = document.getElementById("useApiGateway");
  const apiGatewayRow = document.getElementById("apiGatewayRow");
  const apiGatewayBaseUrlInput = document.getElementById("apiGatewayBaseUrl");

  const useWebResearchCheckbox = document.getElementById("useWebResearch");
  const webResearchRow = document.getElementById("webResearchRow");
  const webResearchBtn = document.getElementById("webResearchBtn");
  const clearWebResearchBtn = document.getElementById("clearWebResearchBtn");
  const webResearchStatus = document.getElementById("webResearchStatus");

  const apiKeyInput = document.getElementById("apiKey");
  const rememberKeyCheckbox = document.getElementById("rememberKey");
  const masterPasswordInput = document.getElementById("masterPassword");
  const perplexityApiKeyInput = document.getElementById("perplexityApiKey");
  const anonymousModeCheckbox = document.getElementById("anonymousMode");
  const modelSelect = document.getElementById("modelSelect");
  const reloadModelsBtn = document.getElementById("reloadModelsBtn");
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
  const aboutToggle = document.getElementById("aboutToggle");
  const aboutModal = document.getElementById("aboutModal");
  const closeAboutModalBtn = document.getElementById("closeAboutModalBtn");

  const presetSelect = document.getElementById("presetSelect");
  const promptModeSelect = document.getElementById("promptMode");
  const tocCheckbox = document.getElementById("tocCheckbox");
  const imageStyleSelect = document.getElementById("imageStyleSelect");
  const imageCountSelect = document.getElementById("imageCountSelect");
  const includeDiagramPromptCheckbox = document.getElementById("includeDiagramPrompt");
  const includeNegativePromptCheckbox = document.getElementById("includeNegativePrompt");

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
  const generateImagePromptsBtn = document.getElementById("generateImagePromptsBtn");
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

  const welcomeOverlay = document.getElementById("welcomeOverlay");
  const welcomeGetStarted = document.getElementById("welcomeGetStarted");
  const welcomeLearnMore = document.getElementById("welcomeLearnMore");

  const generationOptionsBtn = document.getElementById("generationOptionsBtn");
  const generationOptionsPanel = document.getElementById("generationOptionsPanel");

  // Legacy keys (pre-provider support)
  const STORAGE_KEY_API = "openseo_openrouter_key";
  const STORAGE_KEY_MODEL = "openseo_default_model";
  // New multi-provider storage
  const STORAGE_KEY_PROVIDER = "openseo_provider";
  const STORAGE_KEY_PROVIDER_CONFIGS = "openseo_provider_configs";
  // Older transitional keys (kept for cleanup / import compatibility)
  const STORAGE_KEY_API_GENERIC = "openseo_api_key";
  const STORAGE_KEY_BASE_URL = "openseo_base_url";

  // Optional API gateway (portable: local/VPS/Workers)
  const STORAGE_KEY_USE_API_GATEWAY = "openseo_use_api_gateway";
  const STORAGE_KEY_API_GATEWAY_BASE_URL = "openseo_api_gateway_base_url";
  const STORAGE_KEY_USE_WEB_RESEARCH = "openseo_use_web_research";
  const STORAGE_KEY_WEB_RESEARCH_CACHE = "openseo_web_research_cache";
  const STORAGE_KEY_PERPLEXITY_API_KEY = "openseo_perplexity_api_key";

  const STORAGE_KEY_THEME = "openseo_color_theme";
  const STORAGE_KEY_HISTORY = "openseo_article_history";
  const STORAGE_KEY_SPEND = "openseo_monthly_spend";
  const STORAGE_KEY_GENERATION_OPTIONS = "openseo_generation_options";
  const STORAGE_KEY_WELCOME = "openseo_welcome_dismissed";

  // Ghost export (Admin API)
  const STORAGE_KEY_GHOST_ADMIN_URL = "openseo_ghost_admin_url";
  const STORAGE_KEY_GHOST_ADMIN_KEY = "openseo_ghost_admin_key"; // encrypted payload (base64/xor)
  const STORAGE_KEY_GHOST_REMEMBER = "openseo_ghost_remember";

  // WordPress export (BYOC: stored locally only when not in anonymous mode)
  const STORAGE_KEY_WP_CONFIG = "openseo_wordpress_config";

  const MAX_HISTORY_ITEMS = 20;
  const GENERATION_OPTIONS_DEFAULTS = {
    promptMode: "standard",
    tocEnabled: false,
    imageStylePreset: "modern-illustration",
    imageCount: 2,
    includeDiagramPrompt: true,
    includeNegativePrompt: false
  };

  const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";

  let isAnonymous = false;
  let encryptedKeyPayload = null;
  let historyCache = [];
  let generationOptions = { ...GENERATION_OPTIONS_DEFAULTS };
  let articleMarkdown = "";
  let imagePromptsMarkdown = "";
  let lastSeoMetadata = null;
  let webResearchCache = "";
  let lastKeyword = "";

  let lastObservedApiKey = "";
  let lastModelsLoadedKey = "";
  let reloadModelsTimer = null;

  function setItemGuarded(key, value) {
    if (isAnonymous) return;
    window.localStorage.setItem(key, value);
  }

  function readBoolStorage(key, fallback = false) {
    if (isAnonymous) return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return raw === "1" || raw === "true";
  }

  function writeBoolStorage(key, value) {
    setItemGuarded(key, value ? "1" : "0");
  }

  function removeItem(key) {
    window.localStorage.removeItem(key);
  }

  function clearAppStorage() {
    [
      STORAGE_KEY_API,
      STORAGE_KEY_API_GENERIC,
      STORAGE_KEY_PROVIDER,
      STORAGE_KEY_PROVIDER_CONFIGS,
      STORAGE_KEY_BASE_URL,
      STORAGE_KEY_USE_API_GATEWAY,
      STORAGE_KEY_API_GATEWAY_BASE_URL,
      STORAGE_KEY_MODEL,
      STORAGE_KEY_THEME,
      STORAGE_KEY_HISTORY,
      STORAGE_KEY_SPEND,
      STORAGE_KEY_GENERATION_OPTIONS,
      STORAGE_KEY_WELCOME,
      STORAGE_KEY_GHOST_ADMIN_URL,
      STORAGE_KEY_GHOST_ADMIN_KEY,
      STORAGE_KEY_GHOST_REMEMBER,
      STORAGE_KEY_WP_CONFIG
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
    const allowedImageCounts = [0, 2, 3, 4];
    const parsedImageCount = Number(options.imageCount);
    const resolvedImageCount = allowedImageCounts.includes(parsedImageCount)
      ? parsedImageCount
      : GENERATION_OPTIONS_DEFAULTS.imageCount;
    return {
      promptMode: options.promptMode || GENERATION_OPTIONS_DEFAULTS.promptMode,
      tocEnabled: Boolean(options.tocEnabled),
      imageStylePreset: options.imageStylePreset || GENERATION_OPTIONS_DEFAULTS.imageStylePreset,
      imageCount: resolvedImageCount,
      includeDiagramPrompt: options.includeDiagramPrompt !== undefined
        ? Boolean(options.includeDiagramPrompt)
        : GENERATION_OPTIONS_DEFAULTS.includeDiagramPrompt,
      includeNegativePrompt: options.includeNegativePrompt !== undefined
        ? Boolean(options.includeNegativePrompt)
        : GENERATION_OPTIONS_DEFAULTS.includeNegativePrompt
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
    if (imageStyleSelect) {
      imageStyleSelect.value = generationOptions.imageStylePreset;
    }
    if (imageCountSelect) {
      imageCountSelect.value = String(generationOptions.imageCount);
    }
    if (includeDiagramPromptCheckbox) {
      includeDiagramPromptCheckbox.checked = generationOptions.includeDiagramPrompt;
    }
    if (includeNegativePromptCheckbox) {
      includeNegativePromptCheckbox.checked = generationOptions.includeNegativePrompt;
    }
  }

  function syncGenerationOptionsFromUI() {
    if (!promptModeSelect || !tocCheckbox) return;
    generationOptions = normalizeGenerationOptions({
      promptMode: promptModeSelect.value,
      tocEnabled: tocCheckbox.checked,
      imageStylePreset: imageStyleSelect ? imageStyleSelect.value : GENERATION_OPTIONS_DEFAULTS.imageStylePreset,
      imageCount: imageCountSelect ? Number(imageCountSelect.value) : GENERATION_OPTIONS_DEFAULTS.imageCount,
      includeDiagramPrompt: includeDiagramPromptCheckbox ? includeDiagramPromptCheckbox.checked : true,
      includeNegativePrompt: includeNegativePromptCheckbox ? includeNegativePromptCheckbox.checked : false
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

  function looksLikeOpenRouterKey(key) {
    const value = sanitizeApiKey(key);
    if (!value) return false;
    // OpenRouter keys are typically long and start with "sk-", but allow other formats.
    if (value.startsWith("sk-") && value.length >= 24) return true;
    return value.length >= 24;
  }

  function updateReloadModelsButton() {
    if (!reloadModelsBtn) return;
    const provider = getSelectedProvider ? getSelectedProvider() : CHAT_PROVIDERS.openrouter;

    if (provider === CHAT_PROVIDERS.openrouter) {
      const key = apiKeyInput ? sanitizeApiKey(apiKeyInput.value) : "";
      reloadModelsBtn.disabled = !looksLikeOpenRouterKey(key);
      return;
    }

    if (provider === CHAT_PROVIDERS.ollama) {
      const baseUrl = getOllamaBaseUrl ? getOllamaBaseUrl() : "";
      reloadModelsBtn.disabled = !String(baseUrl || "").trim();
      return;
    }

    reloadModelsBtn.disabled = true;
  }

  function scheduleModelsReload({ force = false } = {}) {
    const provider = getSelectedProvider ? getSelectedProvider() : CHAT_PROVIDERS.openrouter;

    if (provider === CHAT_PROVIDERS.openrouter) {
      const key = apiKeyInput ? sanitizeApiKey(apiKeyInput.value) : "";
      updateReloadModelsButton();
      if (!looksLikeOpenRouterKey(key)) return;
      if (!force && key && key === lastModelsLoadedKey) return;

      if (reloadModelsTimer) {
        window.clearTimeout(reloadModelsTimer);
      }

      reloadModelsTimer = window.setTimeout(() => {
        reloadModelsTimer = null;
        fetchAndPopulateModels(key, { force }).catch(() => {
          // fetchAndPopulateModels handles status/UI
        });
      }, 800);

      return;
    }

    if (provider === CHAT_PROVIDERS.ollama) {
      const baseUrl = getOllamaBaseUrl ? getOllamaBaseUrl() : "";
      updateReloadModelsButton();
      if (!String(baseUrl || "").trim()) return;
      if (!force && baseUrl && baseUrl === lastModelsLoadedKey) return;

      if (reloadModelsTimer) {
        window.clearTimeout(reloadModelsTimer);
      }

      reloadModelsTimer = window.setTimeout(() => {
        reloadModelsTimer = null;
        fetchAndPopulateOllamaModels(baseUrl, { force }).catch(() => {
          // fetchAndPopulateOllamaModels handles status/UI
        });
      }, 800);

      return;
    }

    // no-op for other providers
    return;
  }

  // (removed legacy scheduleModelsReload block)

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

  historyCache = loadHistoryFromStorage();
  renderHistory();
  // Provider-specific settings (including API keys / models) are hydrated below.
  showWelcomeIfNeeded();

  // Hydrate web research cache + Perplexity key
  if (!isAnonymous) {
    webResearchCache = (window.localStorage.getItem(STORAGE_KEY_WEB_RESEARCH_CACHE) || "").trim();
    const storedPplx = (window.localStorage.getItem(STORAGE_KEY_PERPLEXITY_API_KEY) || "").trim();
    if (storedPplx && perplexityApiKeyInput) {
      perplexityApiKeyInput.value = storedPplx;
    }
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

  /* ---------- Provider settings ---------- */

  function normalizeProvider(value) {
    const next = (value || "").toLowerCase().trim();
    return CHAT_PROVIDERS[next] || CHAT_PROVIDERS.openrouter;
  }

  function loadProviderConfigs() {
    if (isAnonymous) return {};
    const raw = window.localStorage.getItem(STORAGE_KEY_PROVIDER_CONFIGS);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      console.warn("Unable to parse provider configs:", err);
      return {};
    }
  }

  function persistProviderConfigs(configs) {
    if (isAnonymous) return;
    setItemGuarded(STORAGE_KEY_PROVIDER_CONFIGS, JSON.stringify(configs || {}));
  }

  function getProviderConfig(provider) {
    const configs = loadProviderConfigs();
    const value = configs[provider];
    return value && typeof value === "object" ? value : {};
  }

  function setProviderConfig(provider, partial) {
    const normalized = normalizeProvider(provider);
    const configs = loadProviderConfigs();
    const current = configs[normalized] && typeof configs[normalized] === "object" ? configs[normalized] : {};
    configs[normalized] = { ...current, ...(partial || {}) };
    persistProviderConfigs(configs);
  }

  function migrateLegacyProviderStorageIfNeeded() {
    if (isAnonymous) return;
    const existing = window.localStorage.getItem(STORAGE_KEY_PROVIDER_CONFIGS);
    if (existing) return;

    const legacyKeyRaw = window.localStorage.getItem(STORAGE_KEY_API) || window.localStorage.getItem(STORAGE_KEY_API_GENERIC);
    const legacyModel = window.localStorage.getItem(STORAGE_KEY_MODEL);

    if (!legacyKeyRaw && !legacyModel) return;

    try {
      const payload = legacyKeyRaw ? JSON.parse(legacyKeyRaw) : null;
      const next = {
        openrouter: {
          ...(payload ? { apiKey: payload } : {}),
          ...(legacyModel ? { model: legacyModel } : {})
        }
      };
      window.localStorage.setItem(STORAGE_KEY_PROVIDER_CONFIGS, JSON.stringify(next));
      if (!window.localStorage.getItem(STORAGE_KEY_PROVIDER)) {
        window.localStorage.setItem(STORAGE_KEY_PROVIDER, CHAT_PROVIDERS.openrouter);
      }
    } catch (err) {
      console.warn("Legacy migration failed:", err);
    }
  }

  function getSelectedProvider() {
    const fromUi = providerSelect ? normalizeProvider(providerSelect.value) : "";
    if (fromUi) return fromUi;
    if (isAnonymous) return CHAT_PROVIDERS.openrouter;
    return normalizeProvider(window.localStorage.getItem(STORAGE_KEY_PROVIDER));
  }

  function persistSelectedProvider(provider) {
    if (isAnonymous) return;
    setItemGuarded(STORAGE_KEY_PROVIDER, normalizeProvider(provider));
  }

  function getOllamaBaseUrl() {
    const fromUi = ollamaBaseUrlInput ? (ollamaBaseUrlInput.value || "").trim() : "";
    if (fromUi) return fromUi;

    const stored = getProviderConfig(CHAT_PROVIDERS.ollama)?.baseUrl;
    if (stored) return String(stored).trim();

    // Transitional legacy key.
    if (!isAnonymous) {
      const legacy = (window.localStorage.getItem(STORAGE_KEY_BASE_URL) || "").trim();
      if (legacy) return legacy;
    }

    return OLLAMA_DEFAULT_BASE_URL;
  }

  // Backward-compatible helper used throughout the app.
  function getBaseUrl() {
    const provider = getSelectedProvider();
    return provider === CHAT_PROVIDERS.ollama ? getOllamaBaseUrl() : "";
  }

  function setOllamaBaseUrl(value) {
    const next = (value || "").trim() || OLLAMA_DEFAULT_BASE_URL;
    if (ollamaBaseUrlInput) ollamaBaseUrlInput.value = next;
    setProviderConfig(CHAT_PROVIDERS.ollama, { baseUrl: next });
    // Transitional legacy key.
    if (!isAnonymous) setItemGuarded(STORAGE_KEY_BASE_URL, next);
  }

  // Backward-compatible helper used by import/export.
  function setBaseUrl(value) {
    const provider = getSelectedProvider();
    if (provider !== CHAT_PROVIDERS.ollama) return;
    setOllamaBaseUrl(value);
  }

  function applyProviderUi(provider) {
    const normalized = normalizeProvider(provider);
    const meta = {
      openrouter: {
        label: "OpenRouter API key",
        placeholder: "sk-or-...",
        help: "Stored only in your browser if you choose so.",
        modelHelp: "Enter your API key to load available models directly from OpenRouter."
      },
      openai: {
        label: "OpenAI API key",
        placeholder: "sk-...",
        help: "Stored only in your browser if you choose so.",
        modelHelp: "Choose a model for OpenAI."
      },
      anthropic: {
        label: "Anthropic API key",
        placeholder: "sk-ant-...",
        help: "Stored only in your browser if you choose so.",
        modelHelp: "Choose a Claude model."
      },
      gemini: {
        label: "Gemini API key (AI Studio)",
        placeholder: "AIza...",
        help: "Stored only in your browser if you choose so.",
        modelHelp: "Choose a Gemini model."
      },
      ollama: {
        label: "API key (not required for Ollama)",
        placeholder: "(not required)",
        help: "Ollama runs locally; no API key is needed.",
        modelHelp: "Choose a local Ollama model."
      }
    };

    const m = meta[normalized] || meta.openrouter;

    if (apiKeyLabelText) apiKeyLabelText.textContent = m.label;
    if (apiKeyInput) apiKeyInput.placeholder = m.placeholder;
    if (apiKeyHelpText) apiKeyHelpText.textContent = m.help;
    if (modelHelpText) modelHelpText.textContent = m.modelHelp;

    const isOllama = normalized === CHAT_PROVIDERS.ollama;
    if (ollamaBaseUrlRow) ollamaBaseUrlRow.classList.toggle("hidden", !isOllama);
    if (reloadModelsBtn) {
      reloadModelsBtn.classList.toggle("hidden", normalized !== CHAT_PROVIDERS.openrouter);
    }

    updateReloadModelsButton();
  }

  function decodeStoredApiKey(payload) {
    if (!payload || typeof payload !== "object") return "";

    if (payload.method === "base64") {
      return base64Decode(payload.cipher);
    }

    if (payload.method === "xor") {
      const password = masterPasswordInput ? masterPasswordInput.value : "";
      if (!password) {
        if (statusEl) {
          statusEl.textContent = "Enter your master password to unlock the API key.";
          statusEl.classList.add("error");
        }
        return "";
      }
      return xorDecrypt(payload.cipher, password);
    }

    return "";
  }

  function hydrateProviderFromStorage(provider) {
    if (isAnonymous) return;

    encryptedKeyPayload = null;
    if (apiKeyInput) apiKeyInput.value = "";

    const config = getProviderConfig(provider);
    const payload = config.apiKey;

    if (rememberKeyCheckbox) {
      rememberKeyCheckbox.checked = !!payload;
    }

    if (payload && apiKeyInput) {
      encryptedKeyPayload = payload;
      const key = decodeStoredApiKey(payload);
      if (key) apiKeyInput.value = key;
    }

    if (provider === CHAT_PROVIDERS.ollama) {
      const baseUrl = (config.baseUrl || "").trim() || OLLAMA_DEFAULT_BASE_URL;
      if (ollamaBaseUrlInput) ollamaBaseUrlInput.value = baseUrl;
    }

    const storedModel = config.model;
    if (storedModel && modelSelect) {
      modelSelect.value = storedModel;
    }
  }

  function persistApiKeyForProvider(provider, key) {
    const normalized = normalizeProvider(provider);

    if (isAnonymous) {
      removeItem(STORAGE_KEY_API);
      removeItem(STORAGE_KEY_API_GENERIC);
      removeItem(STORAGE_KEY_PROVIDER_CONFIGS);
      return;
    }

    if (!rememberKeyCheckbox || !rememberKeyCheckbox.checked) {
      const configs = loadProviderConfigs();
      if (configs[normalized]) {
        delete configs[normalized].apiKey;
        persistProviderConfigs(configs);
      }
      if (normalized === CHAT_PROVIDERS.openrouter) {
        removeItem(STORAGE_KEY_API);
        removeItem(STORAGE_KEY_API_GENERIC);
      }
      return;
    }

    const password = masterPasswordInput ? masterPasswordInput.value.trim() : "";
    const payload = password
      ? { method: "xor", cipher: xorEncrypt(key, password) }
      : { method: "base64", cipher: base64Encode(key) };

    encryptedKeyPayload = payload;
    setProviderConfig(normalized, { apiKey: payload });

    // Backward compatible storage for OpenRouter only.
    if (normalized === CHAT_PROVIDERS.openrouter) {
      setItemGuarded(STORAGE_KEY_API_GENERIC, JSON.stringify(payload));
      setItemGuarded(STORAGE_KEY_API, JSON.stringify(payload));
    }
  }

  function persistModelForProvider(provider, model) {
    const normalized = normalizeProvider(provider);
    setProviderConfig(normalized, { model });
    // Backward compatible storage for older versions.
    if (!isAnonymous && normalized === CHAT_PROVIDERS.openrouter) {
      setItemGuarded(STORAGE_KEY_MODEL, model);
    }
  }

  async function refreshModelOptions({ force = false } = {}) {
    const provider = getSelectedProvider();
    applyProviderUi(provider);

    if (provider === CHAT_PROVIDERS.openrouter) {
      const key = apiKeyInput ? sanitizeApiKey(apiKeyInput.value) : "";
      updateReloadModelsButton();
      if (!looksLikeOpenRouterKey(key)) {
        clearModelOptions("Enter your API key to load models");
        return;
      }
      await fetchAndPopulateModels(key, { force });
      return;
    }

    if (provider === CHAT_PROVIDERS.ollama) {
      updateReloadModelsButton();
      await fetchAndPopulateOllamaModels(getOllamaBaseUrl(), { force });
      return;
    }

    const curated = CURATED_MODELS[provider] || [];
    populateModelOptions(curated.map((m) => ({ id: m.id, name: m.label })));
    if (statusEl) {
      statusEl.classList.remove("error", "loading");
      statusEl.textContent = curated.length ? "Models ready." : "Select a provider model.";
    }

    if (modelSelect) {
      modelSelect.disabled = false;
    }
  }

  function setProvider(value) {
    const next = normalizeProvider(value);
    if (providerSelect) providerSelect.value = next;
    persistSelectedProvider(next);

    // Hydrate provider-specific fields.
    hydrateProviderFromStorage(next);
    refreshModelOptions({ force: true }).catch(() => {
      // refreshModelOptions handles status/UI
    });
  }

  migrateLegacyProviderStorageIfNeeded();

  function syncApiGatewayUi() {
    if (useApiGatewayCheckbox && apiGatewayRow) {
      apiGatewayRow.classList.toggle("hidden", !useApiGatewayCheckbox.checked);
    }
    if (useWebResearchCheckbox && webResearchRow) {
      webResearchRow.classList.toggle("hidden", !useWebResearchCheckbox.checked);
    }
  }

  if (useApiGatewayCheckbox) {
    useApiGatewayCheckbox.checked = readBoolStorage(STORAGE_KEY_USE_API_GATEWAY, false);
    syncApiGatewayUi();
    useApiGatewayCheckbox.addEventListener("change", () => {
      writeBoolStorage(STORAGE_KEY_USE_API_GATEWAY, useApiGatewayCheckbox.checked);
      syncApiGatewayUi();
    });
  }

  if (useWebResearchCheckbox) {
    useWebResearchCheckbox.checked = readBoolStorage(STORAGE_KEY_USE_WEB_RESEARCH, false);
    syncApiGatewayUi();
    useWebResearchCheckbox.addEventListener("change", () => {
      writeBoolStorage(STORAGE_KEY_USE_WEB_RESEARCH, useWebResearchCheckbox.checked);
      syncApiGatewayUi();
    });
  }

  if (apiGatewayBaseUrlInput) {
    const storedUrl = !isAnonymous ? window.localStorage.getItem(STORAGE_KEY_API_GATEWAY_BASE_URL) : null;
    apiGatewayBaseUrlInput.value = (storedUrl || "https://api.openseo.studio").trim();
    apiGatewayBaseUrlInput.addEventListener("change", () => {
      setItemGuarded(STORAGE_KEY_API_GATEWAY_BASE_URL, apiGatewayBaseUrlInput.value.trim());
    });
  }

  async function fetchWebResearch({ keyword, planText, languageConfig } = {}) {
    const gateway = getApiGatewayConfig();
    if (!gateway.enabled) {
      throw new Error("Enable ‘Use API endpoint’ to use web research.");
    }

    const key = perplexityApiKeyInput ? sanitizeApiKey(perplexityApiKeyInput.value) : "";
    if (perplexityApiKeyInput) perplexityApiKeyInput.value = key;
    if (!key) throw new Error("Missing Perplexity API key.");

    // Optionally remember in localStorage (same toggle as provider keys)
    if (!isAnonymous && rememberKeyCheckbox && rememberKeyCheckbox.checked) {
      setItemGuarded(STORAGE_KEY_PERPLEXITY_API_KEY, key);
    }

    const endpoint = `${gateway.baseUrl.replace(/\/+$/, "")}/v1/research/perplexity`;

    const queryParts = [
      keyword ? `Topic: ${keyword}` : "",
      planText ? `Outline:\n${String(planText).slice(0, 3000)}` : "",
      languageConfig?.promptName ? `Language: ${languageConfig.promptName}` : ""
    ].filter(Boolean);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // BYOK: user's key is forwarded to the gateway; nothing is stored server-side.
        authorization: `Bearer ${key}`
      },
      body: JSON.stringify({ query: queryParts.join("\n\n"), maxSources: 8 })
    });

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) {
      const msg = data?.error || data?.message || text || `Research failed (HTTP ${res.status}).`;
      throw new Error(String(msg).slice(0, 500));
    }

    const report = String(data?.report || "").trim();
    if (!report) throw new Error("Empty research response.");

    webResearchCache = report;
    setItemGuarded(STORAGE_KEY_WEB_RESEARCH_CACHE, webResearchCache);
    return report;
  }

  function setWebResearchStatus(text, { error = false, loading = false } = {}) {
    if (!webResearchStatus) return;
    webResearchStatus.textContent = text || "";
    webResearchStatus.classList.toggle("error", !!error);
    webResearchStatus.classList.toggle("loading", !!loading);
  }

  if (webResearchBtn) {
    webResearchBtn.addEventListener("click", async () => {
      try {
        setWebResearchStatus("Fetching web research…", { loading: true });
        webResearchBtn.disabled = true;
        const keyword = keywordInput ? keywordInput.value.trim() : "";
        const planText = planEditor ? planEditor.value : "";
        const languageConfig = getSelectedLanguage();
        await fetchWebResearch({ keyword, planText, languageConfig });
        setWebResearchStatus("Web research ready.", { loading: false });
      } catch (err) {
        console.error("web research error", err);
        setWebResearchStatus(String(err?.message || err), { error: true, loading: false });
      } finally {
        webResearchBtn.disabled = false;
      }
    });
  }

  if (clearWebResearchBtn) {
    clearWebResearchBtn.addEventListener("click", () => {
      webResearchCache = "";
      removeItem(STORAGE_KEY_WEB_RESEARCH_CACHE);
      setWebResearchStatus("Cleared.");
    });
  }

  if (providerSelect) {
    const storedProvider = !isAnonymous ? window.localStorage.getItem(STORAGE_KEY_PROVIDER) : null;
    providerSelect.value = normalizeProvider(storedProvider);
    providerSelect.addEventListener("change", () => setProvider(providerSelect.value));
  }

  if (ollamaBaseUrlInput) {
    ollamaBaseUrlInput.value = getOllamaBaseUrl();
    ollamaBaseUrlInput.addEventListener("change", () => setOllamaBaseUrl(ollamaBaseUrlInput.value));
  }

  // Initial provider hydrate.
  applyProviderUi(getSelectedProvider());
  hydrateProviderFromStorage(getSelectedProvider());

  if (modelSelect) {
    modelSelect.addEventListener("change", () => {
      persistModelForProvider(getSelectedProvider(), modelSelect.value);
    });
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener("change", () => {
      const provider = getSelectedProvider();
      const requiresKey = provider !== CHAT_PROVIDERS.ollama;
      const key = sanitizeApiKey(apiKeyInput.value);
      apiKeyInput.value = key;

      if (!key && requiresKey) {
        clearModelOptions();
        persistApiKeyForProvider(provider, "");
        return;
      }

      if (requiresKey && key) {
        persistApiKeyForProvider(provider, key);
      }

      refreshModelOptions({ force: true }).catch(() => {
        // refreshModelOptions handles status/UI
      });
    });
  }

  if (rememberKeyCheckbox) {
    rememberKeyCheckbox.addEventListener("change", () => {
      const provider = getSelectedProvider();
      const key = sanitizeApiKey(apiKeyInput ? apiKeyInput.value : "");
      if (!key) {
        persistApiKeyForProvider(provider, "");
        return;
      }
      persistApiKeyForProvider(provider, key);
    });
  }

  if (masterPasswordInput) {
    masterPasswordInput.addEventListener("input", () => {
      if (!encryptedKeyPayload || encryptedKeyPayload.method !== "xor") return;
      if (apiKeyInput && !apiKeyInput.value && masterPasswordInput.value) {
        try {
          const key = xorDecrypt(encryptedKeyPayload.cipher, masterPasswordInput.value);
          apiKeyInput.value = key;
          refreshModelOptions({ force: true }).catch(() => {
            // refreshModelOptions handles status/UI
          });
          statusEl.classList.remove("error");
          statusEl.textContent = "API key unlocked.";
        } catch (err) {
          console.error("masterPassword decrypt error", err);
        }
      }
    });
  }

  if (reloadModelsBtn) {
    reloadModelsBtn.addEventListener("click", () => {
      refreshModelOptions({ force: true }).catch(() => {
        // refreshModelOptions handles status/UI
      });
    });
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener("input", () => {
      updateReloadModelsButton();
    });

    // If the API key is set programmatically (apiKeyInput.value = ...),
    // poll for changes and auto-refresh models (OpenRouter only).
    window.setInterval(() => {
      const provider = getSelectedProvider();
      const nextKey = sanitizeApiKey(apiKeyInput.value);
      if (nextKey === lastObservedApiKey) return;
      lastObservedApiKey = nextKey;
      updateReloadModelsButton();
      if (provider === CHAT_PROVIDERS.openrouter) {
        scheduleModelsReload();
      }
    }, 800);
  }

  refreshModelOptions({ force: false }).catch(() => {
    // refreshModelOptions handles status/UI
  });

  /* ---------- Welcome overlay ---------- */

  function hasStoredApiKey() {
    const provider = getSelectedProvider();
    if (provider === CHAT_PROVIDERS.ollama) return true;

    const inputKey = apiKeyInput ? sanitizeApiKey(apiKeyInput.value) : "";
    if (inputKey) return true;
    if (isAnonymous) return false;

    const config = getProviderConfig(provider);
    if (config && config.apiKey) return true;

    // Legacy OpenRouter-only storage.
    const raw = window.localStorage.getItem(STORAGE_KEY_API_GENERIC) || window.localStorage.getItem(STORAGE_KEY_API);
    return !!raw;
  }

  function isWelcomeDismissed() {
    if (isAnonymous) return false;
    return window.localStorage.getItem(STORAGE_KEY_WELCOME) === "1";
  }

  function openWelcomeOverlay() {
    if (!welcomeOverlay) return;
    welcomeOverlay.classList.add("open");
    welcomeOverlay.setAttribute("aria-hidden", "false");
    if (welcomeGetStarted) {
      welcomeGetStarted.focus();
    }
  }

  function closeWelcomeOverlay({ persist = true } = {}) {
    if (!welcomeOverlay) return;
    welcomeOverlay.classList.remove("open");
    welcomeOverlay.setAttribute("aria-hidden", "true");
    if (persist && !isAnonymous) {
      window.localStorage.setItem(STORAGE_KEY_WELCOME, "1");
    }
  }

  function showWelcomeIfNeeded() {
    if (!welcomeOverlay) return;
    if (hasStoredApiKey()) {
      closeWelcomeOverlay({ persist: false });
      return;
    }
    if (!isWelcomeDismissed()) {
      openWelcomeOverlay();
    }
  }

  if (welcomeGetStarted) {
    welcomeGetStarted.addEventListener("click", () => {
      closeWelcomeOverlay();
      if (menuPanel) {
        menuPanel.classList.add("open");
        menuPanel.setAttribute("aria-hidden", "false");
      }
      if (apiKeyInput) {
        apiKeyInput.focus();
      }
    });
  }

  if (welcomeLearnMore) {
    welcomeLearnMore.addEventListener("click", () => {
      closeWelcomeOverlay();
      if (aboutToggle) {
        aboutToggle.click();
      }
    });
  }

  if (welcomeOverlay) {
    welcomeOverlay.addEventListener("click", (event) => {
      if (event.target === welcomeOverlay) {
        closeWelcomeOverlay();
      }
    });
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener("input", () => {
      if (hasStoredApiKey()) {
        closeWelcomeOverlay({ persist: false });
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

      showWelcomeIfNeeded();
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
      applyTheme(resolveTheme());
      hydrateProviderFromStorage(getSelectedProvider());
      refreshModelOptions({ force: true }).catch(() => {
        // refreshModelOptions handles status/UI
      });
      persistGenerationOptions(generationOptions);
    }
    showWelcomeIfNeeded();
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

  [imageStyleSelect, imageCountSelect, includeDiagramPromptCheckbox, includeNegativePromptCheckbox].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", syncGenerationOptionsFromUI);
  });

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
      closeAboutModal();
      closeWelcomeOverlay();
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

  function getPlanSectionHeadings(limit = 4) {
    if (!planEditor || !planEditor.value) return [];
    const headings = parseHeadings(planEditor.value);
    return headings
      .filter((heading) => heading.level === 2 && heading.text)
      .map((heading) => heading.text)
      .slice(0, limit);
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

  function handleKeywordChange(nextKeyword) {
    const trimmed = (nextKeyword || "").trim();
    if (trimmed !== lastKeyword) {
      if (lastKeyword || trimmed) {
        imagePromptsMarkdown = "";
      }
      lastKeyword = trimmed;
    }
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
      articleMarkdown = outputArea.value;
      updateMetrics();
      renderPreview(outputArea.value);
      updateInsights();
    });
    articleMarkdown = outputArea.value;
    updateMetrics();
    renderPreview(outputArea.value);
    updateInsights();
  }

  if (keywordInput) {
    lastKeyword = keywordInput.value.trim();
  }

  [keywordInput, lengthSelect, languageSelect, toneSelect, extraInput].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", () => {
      if (el === keywordInput) {
        handleKeywordChange(keywordInput.value);
      }
      updateEstimates();
      updateInsights();
    });
    el.addEventListener("input", () => {
      if (el === keywordInput) {
        handleKeywordChange(keywordInput.value);
      }
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

  /* ---------- Load models from OpenRouter / Ollama ---------- */

  async function fetchAndPopulateOllamaModels(baseUrl, { force = false } = {}) {
    if (!modelSelect) return;

    const resolved = String(baseUrl || "").trim().replace(/\/+$/, "");
    if (!resolved) {
      statusEl.textContent = "Please provide your Ollama base URL in the settings menu.";
      statusEl.classList.add("error");
      clearModelOptions();
      updateReloadModelsButton();
      return;
    }

    if (!force && resolved === lastModelsLoadedKey) {
      updateReloadModelsButton();
      return;
    }

    modelSelect.disabled = true;
    statusEl.classList.remove("error");
    statusEl.classList.add("loading");
    statusEl.textContent = "Loading models from Ollama...";

    try {
      const response = await fetch(`${resolved}/api/tags`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text?.slice(0, 300) || `Unable to fetch Ollama models (${response.status}).`);
      }

      const payload = await response.json();
      const models = Array.isArray(payload?.models) ? payload.models : [];

      const mapped = models
        .map((m) => ({
          id: m?.name,
          name: m?.name,
          description: m?.digest ? `${m.digest}` : undefined
        }))
        .filter((m) => m?.id);

      populateModelOptions(mapped);
      lastModelsLoadedKey = resolved;
      updateReloadModelsButton();
      statusEl.classList.remove("loading");
      statusEl.textContent = mapped.length
        ? "Ollama models loaded. Choose your preferred model."
        : "No local Ollama models found (pull one first).";
    } catch (err) {
      console.error("fetchAndPopulateOllamaModels error:", err);
      statusEl.classList.remove("loading");
      statusEl.classList.add("error");
      statusEl.textContent = `Could not load Ollama models: ${err.message}`;
      clearModelOptions("Enter your Ollama base URL to load models");
      updateReloadModelsButton();
    }
  }

  async function fetchAndPopulateModels(apiKey, { force = false } = {}) {
    if (!modelSelect) return;

    const sanitizedKey = sanitizeApiKey(apiKey);
    if (!sanitizedKey) {
      statusEl.textContent = "Please provide a valid OpenRouter API key.";
      statusEl.classList.add("error");
      clearModelOptions("Enter your API key to load models");
      updateReloadModelsButton();
      return;
    }

    if (!force && sanitizedKey === lastModelsLoadedKey) {
      updateReloadModelsButton();
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
      lastModelsLoadedKey = sanitizedKey;
      updateReloadModelsButton();
      statusEl.classList.remove("loading");
      statusEl.textContent = models.length
        ? "Models loaded. Choose your preferred model."
        : "No models returned by OpenRouter.";
    } catch (err) {
      console.error("fetchAndPopulateModels error:", err);
      statusEl.classList.remove("loading");
      statusEl.classList.add("error");
      statusEl.textContent = `Could not load models: ${err.message}`;
      clearModelOptions("Enter your API key to load models");
      updateReloadModelsButton();
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

  function clearModelOptions(placeholderText) {
    if (!modelSelect) return;
    modelSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = placeholderText || "Enter your API key to load models";
    modelSelect.appendChild(placeholder);
    modelSelect.disabled = true;
    removeItem(STORAGE_KEY_MODEL);
    lastModelsLoadedKey = "";
    updateReloadModelsButton();
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

  function getExportContent(mode) {
    // Prefer the latest generated content, but fall back to whatever is currently
    // in the output textarea (e.g. after a refresh, or when loading from History).
    const articleContent = (articleMarkdown || (outputArea ? outputArea.value : "") || "");
    const hasArticle = articleContent.trim();
    if (!hasArticle) {
      return { error: "No article content to export yet." };
    }

    if (mode === "article") {
      return { content: articleContent.trim() };
    }

    if (mode === "article+images") {
      if (!imagePromptsMarkdown || !imagePromptsMarkdown.trim()) {
        return { error: "No image prompts generated yet." };
      }
      return {
        content: `${articleContent.trim()}\n\n---\n\n${imagePromptsMarkdown.trim()}`
      };
    }

    return { error: "Unknown export mode." };
  }

  function downloadMarkdownWithMode(mode) {
    if (!outputArea) return;
    statusEl.classList.remove("error", "loading");
    const { content, error } = getExportContent(mode);
    if (error) {
      statusEl.textContent = error;
      statusEl.classList.add("error");
      return;
    }
    const filename = getMarkdownFilename();
    const blob = new Blob([content], { type: "text/markdown" });
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

  function getExportJsonPayload() {
    const keyword = keywordInput ? keywordInput.value.trim() : "";
    const language = languageSelect ? languageSelect.value : "";
    const tone = toneSelect ? toneSelect.value : "";
    const length = lengthSelect ? lengthSelect.value : "";
    const model = modelSelect ? modelSelect.value : "";

    return {
      app: "openseo-studio",
      version: (document.querySelector("title")?.textContent || "").trim(),
      exported_at: new Date().toISOString(),
      keyword,
      settings: {
        language,
        tone,
        length,
        model
      },
      plan_markdown: planEditor ? planEditor.value : "",
      article_markdown: articleMarkdown || (outputArea ? outputArea.value : ""),
      seo_metadata: {
        seo_title: lastSeoMetadata?.seo_title || (seoTitleText ? seoTitleText.textContent : ""),
        meta_description: lastSeoMetadata?.meta_description || (metaDescriptionText ? metaDescriptionText.textContent : ""),
        secondary_keywords:
          lastSeoMetadata?.secondary_keywords || (secondaryKeywordsText ? secondaryKeywordsText.textContent : "")
      },
      image_prompts_markdown: imagePromptsMarkdown || ""
    };
  }

  function downloadExportJson() {
    const payload = getExportJsonPayload();
    const keyword = payload.keyword || "article";
    const slug = slugifyKeyword(keyword);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `${slug}-${today}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
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

  async function copyExportJson() {
    const payload = getExportJsonPayload();
    const text = JSON.stringify(payload, null, 2);

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      statusEl.textContent = "JSON copied to clipboard.";
      return;
    }

    // fallback
    fallbackCopy(text);
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

  function loadWordPressConfig() {
    if (isAnonymous) return {};
    const raw = window.localStorage.getItem(STORAGE_KEY_WP_CONFIG);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      console.warn("Unable to parse WordPress config:", err);
      return {};
    }
  }

  function persistWordPressConfig(config) {
    if (isAnonymous) return;
    setItemGuarded(STORAGE_KEY_WP_CONFIG, JSON.stringify(config || {}));
  }

  function normalizeWpSiteUrl(value) {
    const trimmed = (value || "").trim();
    if (!trimmed) return "";
    return trimmed.replace(/\/+$/, "");
  }

  function wpApiBase(siteUrl) {
    const base = normalizeWpSiteUrl(siteUrl);
    return base ? `${base}/wp-json/wp/v2` : "";
  }

  function wpAuthHeader(username, applicationPassword) {
    const user = (username || "").trim();
    const pass = (applicationPassword || "").trim();
    const token = base64Encode(`${user}:${pass}`);
    return `Basic ${token}`;
  }

  async function wpFetchJson(url, { method = "GET", headers = {}, body } = {}) {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    // WordPress returns JSON errors; CORS failures throw before this.
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (err) {
      // Non-JSON response
    }

    if (!res.ok) {
      const message = (json && (json.message || json.code)) || text || `HTTP ${res.status}`;
      const error = new Error(message);
      error.status = res.status;
      error.payload = json;
      throw error;
    }

    return json;
  }

  function parseCommaList(value) {
    if (!value) return [];
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  function slugifyTerm(value) {
    return slugifyKeyword(value).slice(0, 190);
  }

  async function ensureWpTerms({ apiBase, authHeader, type, names }) {
    const unique = Array.from(new Set((names || []).map((n) => n.trim()).filter(Boolean)));
    if (!unique.length) return [];

    const endpoint = type === "tag" ? "tags" : "categories";

    async function findExisting(name) {
      const searchUrl = `${apiBase}/${endpoint}?search=${encodeURIComponent(name)}&per_page=100`;
      const results = await wpFetchJson(searchUrl, {
        headers: { Authorization: authHeader }
      });
      if (!Array.isArray(results)) return null;
      const lower = name.toLowerCase();
      return results.find((t) => (t.name || "").toLowerCase() === lower) || null;
    }

    async function create(name) {
      const createUrl = `${apiBase}/${endpoint}`;
      return wpFetchJson(createUrl, {
        method: "POST",
        headers: { Authorization: authHeader },
        body: { name, slug: slugifyTerm(name) }
      });
    }

    const ids = [];
    for (const name of unique) {
      let term = null;
      try {
        term = await findExisting(name);
      } catch (err) {
        // Some sites disallow term search; try create and fall back.
      }

      if (!term) {
        try {
          term = await create(name);
        } catch (err) {
          // If create fails because it already exists, retry search once.
          try {
            term = await findExisting(name);
          } catch (err2) {
            throw err;
          }
        }
      }

      if (term && typeof term.id === "number") ids.push(term.id);
    }

    return ids;
  }

  function deriveWpTitle() {
    const payload = getExportJsonPayload();
    const fromSeoTitle = (payload.seo_metadata?.seo_title || "").trim();
    if (fromSeoTitle) return fromSeoTitle;
    const fromContent = deriveHistoryTitle(articleMarkdown || (outputArea ? outputArea.value : ""));
    return (fromContent || "Untitled").trim();
  }

  function renderWpExportModal() {
    if (!exportModal || !exportModalTitle || !exportModalSubtitle || !exportModalBody) return;

    const stored = loadWordPressConfig();
    const defaultSiteUrl = stored.siteUrl || "";
    const defaultUsername = stored.username || "";
    const defaultAppPassword = stored.applicationPassword || "";
    const defaultRemember = stored.remember !== undefined ? !!stored.remember : true;

    const keyword = keywordInput ? keywordInput.value.trim() : "";
    const defaultCategories = stored.categories ?? "";
    const defaultTags = stored.tags ?? (keyword ? keyword : "");
    const defaultStatus = stored.postStatus || "draft";

    exportModalTitle.textContent = "Send to WordPress";
    exportModalSubtitle.textContent = "Create a draft or publish via the WP REST API (client-side).";

    exportModalBody.innerHTML = `
      <form class="modal-form" id="wpExportForm">
        <p class="small-note">
          Uses <code>Basic Auth</code> with a WordPress <strong>Application Password</strong>.
          Your credentials stay in your browser (optional).
        </p>

        <label class="field-label" for="wpSiteUrl">WordPress site URL</label>
        <input class="field-input" id="wpSiteUrl" type="url" placeholder="https://example.com" required value="${defaultSiteUrl.replace(/"/g, "&quot;")}">

        <div class="grid-2">
          <div>
            <label class="field-label" for="wpUsername">Username</label>
            <input class="field-input" id="wpUsername" type="text" autocomplete="username" required value="${defaultUsername.replace(/"/g, "&quot;")}">
          </div>
          <div>
            <label class="field-label" for="wpAppPassword">Application password</label>
            <input class="field-input" id="wpAppPassword" type="password" autocomplete="current-password" required value="${defaultAppPassword.replace(/"/g, "&quot;")}">
          </div>
        </div>

        <div class="grid-2">
          <div>
            <label class="field-label" for="wpPostStatus">Post status</label>
            <select class="field-input" id="wpPostStatus">
              <option value="draft" ${defaultStatus === "draft" ? "selected" : ""}>Draft</option>
              <option value="publish" ${defaultStatus === "publish" ? "selected" : ""}>Publish</option>
            </select>
          </div>
          <div>
            <label class="field-label" for="wpTitle">Title</label>
            <input class="field-input" id="wpTitle" type="text" value="${deriveWpTitle().replace(/"/g, "&quot;")}">
          </div>
        </div>

        <label class="field-label" for="wpCategories">Categories (comma-separated)</label>
        <input class="field-input" id="wpCategories" type="text" placeholder="SEO, Marketing" value="${String(defaultCategories).replace(/"/g, "&quot;")}">

        <label class="field-label" for="wpTags">Tags (comma-separated)</label>
        <input class="field-input" id="wpTags" type="text" placeholder="content, ai" value="${String(defaultTags).replace(/"/g, "&quot;")}">

        <label class="checkbox-row">
          <input type="checkbox" id="wpRemember" ${(!isAnonymous && defaultRemember) ? "checked" : ""} ${isAnonymous ? "disabled" : ""}>
          <span>Remember these WordPress settings in this browser</span>
        </label>

        <p class="small-note" id="wpExportStatus"></p>

        <div class="actions-row wrap">
          <button type="button" class="btn-secondary" id="wpTestBtn">Test connection</button>
          <button type="submit" class="btn-primary" id="wpSubmitBtn">Create post</button>
        </div>

        <p class="small-note">
          Notes: your site must allow REST API access from the browser (CORS). If this fails with a network/CORS error,
          consider running the app from the same domain or using a small proxy.
        </p>
      </form>
    `;

    const form = document.getElementById("wpExportForm");
    const statusLine = document.getElementById("wpExportStatus");
    const testBtn = document.getElementById("wpTestBtn");
    const submitBtn = document.getElementById("wpSubmitBtn");

    function setWpModalStatus(text, { error = false, loading = false } = {}) {
      if (!statusLine) return;
      statusLine.textContent = text || "";
      statusLine.classList.toggle("error", !!error);
      statusLine.classList.toggle("loading", !!loading);
    }

    async function testConnection(values) {
      const apiBase = wpApiBase(values.siteUrl);
      const authHeader = wpAuthHeader(values.username, values.applicationPassword);
      const me = await wpFetchJson(`${apiBase}/users/me?context=edit`, {
        headers: { Authorization: authHeader }
      });
      return me;
    }

    function readValues() {
      const siteUrl = normalizeWpSiteUrl(document.getElementById("wpSiteUrl")?.value);
      const username = (document.getElementById("wpUsername")?.value || "").trim();
      const applicationPassword = (document.getElementById("wpAppPassword")?.value || "").trim();
      const postStatus = document.getElementById("wpPostStatus")?.value || "draft";
      const title = (document.getElementById("wpTitle")?.value || "").trim() || deriveWpTitle();
      const categories = document.getElementById("wpCategories")?.value || "";
      const tags = document.getElementById("wpTags")?.value || "";
      const remember = !!document.getElementById("wpRemember")?.checked;
      return { siteUrl, username, applicationPassword, postStatus, title, categories, tags, remember };
    }

    async function createPost(values) {
      const { content, error } = getExportContent("article");
      if (error) throw new Error(error);

      const apiBase = wpApiBase(values.siteUrl);
      const authHeader = wpAuthHeader(values.username, values.applicationPassword);

      const html = window.marked && typeof window.marked.parse === "function"
        ? window.marked.parse(content)
        : content;

      const categoryNames = parseCommaList(values.categories);
      const tagNames = parseCommaList(values.tags);

      const [categoryIds, tagIds] = await Promise.all([
        ensureWpTerms({ apiBase, authHeader, type: "category", names: categoryNames }),
        ensureWpTerms({ apiBase, authHeader, type: "tag", names: tagNames })
      ]);

      const exportPayload = getExportJsonPayload();
      const metaDescription = (exportPayload?.seo_metadata?.meta_description || "").trim();

      const postPayload = {
        title: values.title,
        content: html,
        status: values.postStatus,
        ...(metaDescription ? { excerpt: metaDescription } : {}),
        ...(categoryIds.length ? { categories: categoryIds } : {}),
        ...(tagIds.length ? { tags: tagIds } : {})
      };

      return wpFetchJson(`${apiBase}/posts`, {
        method: "POST",
        headers: { Authorization: authHeader },
        body: postPayload
      });
    }

    async function withBusyState(fn) {
      if (submitBtn) submitBtn.disabled = true;
      if (testBtn) testBtn.disabled = true;
      try {
        return await fn();
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (testBtn) testBtn.disabled = false;
      }
    }

    if (testBtn) {
      testBtn.addEventListener("click", () => {
        const values = readValues();
        if (!values.siteUrl || !values.username || !values.applicationPassword) {
          setWpModalStatus("Please fill Site URL, Username and Application password.", { error: true });
          return;
        }

        setWpModalStatus("Testing connection…", { loading: true });
        withBusyState(async () => {
          const me = await testConnection(values);
          setWpModalStatus(`Connected as ${me?.name || me?.username || "user"}.`, { loading: false });
        }).catch((err) => {
          console.error("wp test error:", err);
          setWpModalStatus(`Connection failed: ${err.message || err}`, { error: true });
        });
      });
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = readValues();
        if (!values.siteUrl || !values.username || !values.applicationPassword) {
          setWpModalStatus("Please fill Site URL, Username and Application password.", { error: true });
          return;
        }

        setWpModalStatus("Creating post…", { loading: true });
        withBusyState(async () => {
          const post = await createPost(values);

          if (!isAnonymous && values.remember) {
            persistWordPressConfig({
              siteUrl: values.siteUrl,
              username: values.username,
              applicationPassword: values.applicationPassword,
              categories: values.categories,
              tags: values.tags,
              postStatus: values.postStatus,
              remember: true
            });
          } else if (!isAnonymous) {
            persistWordPressConfig({ remember: false });
          }

          const link = post?.link || "";
          setWpModalStatus(
            `✅ Post created (id: ${post?.id || "?"}). ${link ? "Open: " + link : ""}`,
            { loading: false }
          );
        }).catch((err) => {
          console.error("wp create error:", err);
          const msg = err?.payload?.message || err.message || String(err);
          setWpModalStatus(`Failed: ${msg}`, { error: true });
        });
      });
    }

    exportModal.classList.add("open");
    exportModal.setAttribute("aria-hidden", "false");
  }

  function base64UrlEncodeBytes(bytes) {
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary)
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  function base64UrlEncodeJson(obj) {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    return base64UrlEncodeBytes(bytes);
  }

  function hexToBytes(hex) {
    const cleaned = (hex || "").trim().replace(/^0x/i, "");
    if (!cleaned || cleaned.length % 2 !== 0 || /[^0-9a-f]/i.test(cleaned)) return null;
    const out = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) {
      out[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
    }
    return out;
  }

  function normalizeGhostSiteUrl(input) {
    const trimmed = String(input || "").trim();
    if (!trimmed) return "";
    const withoutTrailing = trimmed.replace(/\/+$/g, "");
    return withoutTrailing.replace(/\/ghost$/i, "");
  }

  function loadGhostSettings() {
    if (isAnonymous) {
      return { url: "", key: "", remember: false };
    }

    const url = (window.localStorage.getItem(STORAGE_KEY_GHOST_ADMIN_URL) || "").trim();
    const remember = readBoolStorage(STORAGE_KEY_GHOST_REMEMBER, false);

    let key = "";
    if (remember) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_GHOST_ADMIN_KEY);
        const payload = raw ? JSON.parse(raw) : null;
        key = payload ? decodeStoredApiKey(payload) : "";
      } catch (err) {
        console.warn("Unable to parse Ghost key payload:", err);
      }
    }

    return { url, key, remember };
  }

  function persistGhostSettings({ url, key, remember }) {
    if (isAnonymous) return;

    setItemGuarded(STORAGE_KEY_GHOST_ADMIN_URL, String(url || "").trim());
    writeBoolStorage(STORAGE_KEY_GHOST_REMEMBER, !!remember);

    if (!remember) {
      removeItem(STORAGE_KEY_GHOST_ADMIN_KEY);
      return;
    }

    const password = masterPasswordInput ? masterPasswordInput.value.trim() : "";
    const payload = password
      ? { method: "xor", cipher: xorEncrypt(key, password) }
      : { method: "base64", cipher: base64Encode(key) };

    setItemGuarded(STORAGE_KEY_GHOST_ADMIN_KEY, JSON.stringify(payload));
  }

  function inferTitleFromMarkdown(md) {
    const text = String(md || "");
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return trimmed.replace(/^#\s+/, "").trim();
      }
      if (trimmed) break;
    }
    return "";
  }

  function parseTagsCsv(input) {
    return String(input || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  async function createGhostAdminToken(adminKey) {
    const raw = String(adminKey || "").trim();
    const parts = raw.split(":");
    if (parts.length !== 2) {
      throw new Error("Ghost Admin API key must look like <id>:<secret>." );
    }

    const [id, secretHex] = parts;
    const secretBytes = hexToBytes(secretHex);
    if (!secretBytes) {
      throw new Error("Ghost Admin API key secret must be a hex string.");
    }

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 5 * 60;

    const header = { alg: "HS256", typ: "JWT", kid: id };
    const payload = { iat, exp, aud: "/admin/" };

    const encodedHeader = base64UrlEncodeJson(header);
    const encodedPayload = base64UrlEncodeJson(payload);
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    const sigBytes = new Uint8Array(signature);
    const encodedSig = base64UrlEncodeBytes(sigBytes);

    return `${unsignedToken}.${encodedSig}`;
  }

  async function sendPostToGhost({ adminUrl, adminKey, title, html, tags, featureImage, publish, metaTitle, metaDescription, excerpt }) {
    const siteUrl = normalizeGhostSiteUrl(adminUrl);
    if (!siteUrl) throw new Error("Ghost site URL is required.");
    if (!adminKey) throw new Error("Ghost Admin API key is required.");

    const gateway = getApiGatewayConfig();

    // If a gateway is enabled and correctly configured, use it.
    // Otherwise, fall back to calling the Ghost Admin API directly from the browser.
    // (This may fail on some setups due to CORS, but it's the expected BYOK behavior.)
    const gatewayBase = String(gateway?.baseUrl || "").trim().replace(/\/+$/, "");
    const looksLikeOpenRouter = /openrouter\.ai\/?api\/?v1/i.test(gatewayBase);

    if (gateway?.enabled && gatewayBase && !looksLikeOpenRouter) {
      const endpoint = `${gatewayBase}/v1/publish/ghost`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl,
          adminKey,
          title: title || "Untitled",
          html,
          tags,
          featureImage,
          publish: !!publish,
          metaTitle,
          metaDescription,
          excerpt
        })
      });

      const bodyText = await res.text();
      let data = null;
      try {
        data = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg = data?.error || data?.message || bodyText || `Ghost request failed (HTTP ${res.status}).`;
        throw new Error(String(msg).slice(0, 500));
      }

      return data?.post || null;
    }

    if (gateway?.enabled && looksLikeOpenRouter) {
      throw new Error(
        "Your API gateway base URL is set to OpenRouter (openrouter.ai). Ghost publishing needs either a Ghost-compatible gateway (/v1/publish/ghost) or direct Ghost Admin API access. Disable ‘Use API endpoint’ or set it to your gateway domain."
      );
    }

    // Direct Ghost Admin API call
    const jwt = await createGhostAdminToken(adminKey);
    const apiUrl = `${siteUrl.replace(/\/+$/, "")}/ghost/api/admin/posts/?source=html`;

    const payload = {
      posts: [
        {
          title: (title || "Untitled").trim(),
          html: html || "",
          status: publish ? "published" : "draft",
          ...(featureImage ? { feature_image: featureImage } : {}),
          ...(metaTitle ? { meta_title: String(metaTitle).trim() } : {}),
          ...(metaDescription ? { meta_description: String(metaDescription).trim() } : {}),
          ...(excerpt ? { custom_excerpt: String(excerpt).trim() } : {}),
          ...(tags && tags.length
            ? {
                tags: tags
                  .filter(Boolean)
                  .map((t) => ({ name: String(t).trim() }))
                  .filter((t) => t.name)
              }
            : {})
        }
      ]
    };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Ghost ${jwt}`
      },
      body: JSON.stringify(payload)
    });

    const bodyText = await res.text();
    let data = null;
    try {
      data = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data?.errors?.[0]?.message || data?.error || data?.message || bodyText || `Ghost request failed (HTTP ${res.status}).`;
      throw new Error(String(msg).slice(0, 700));
    }

    return data?.posts?.[0] || null;
  }

  function openExportModal(platform) {
    if (!exportModal || !exportModalTitle || !exportModalSubtitle || !exportModalBody) {
      throw new Error("Export modal elements not found in DOM.");
    }

    if (platform === "wordpress") {
      renderWpExportModal();
      return;
    }

    const isGhost = platform === "ghost";
    exportModalTitle.textContent = isGhost ? "Send to Ghost" : "Send to WordPress";

    if (!isGhost) {
      exportModalSubtitle.textContent = "Create a draft via the WordPress REST API";

      exportModalBody.innerHTML = `
        <p class="small-note">
          This sends your content to WordPress as a <strong>draft</strong>. For reliability (CORS), enable <strong>Use API endpoint</strong> in Settings.
        </p>

        <label class="field-label" for="wpSiteUrl">
          WordPress site URL
          <span class="field-help">Example: https://your-site.com</span>
        </label>
        <input type="url" id="wpSiteUrl" class="field-input" placeholder="https://your-site.com" autocomplete="off">

        <label class="field-label" for="wpUsername">Username</label>
        <input type="text" id="wpUsername" class="field-input" placeholder="admin" autocomplete="off">

        <label class="field-label" for="wpAppPassword">
          Application password
          <span class="field-help">Generate in WordPress: Users → Profile → Application Passwords.</span>
        </label>
        <input type="password" id="wpAppPassword" class="field-input" placeholder="xxxx xxxx xxxx xxxx" autocomplete="off">

        <label class="field-label" for="wpTitle">Title</label>
        <input type="text" id="wpTitle" class="field-input" value="">

        <p class="status-text" id="wpModalStatus"></p>

        <div class="config-actions">
          <button type="button" id="wpSendBtn" class="btn-primary">Create draft</button>
        </div>
      `;

      exportModal.classList.add("open");
      exportModal.setAttribute("aria-hidden", "false");

      const payload = getExportJsonPayload();
      const articleMd = payload.article_markdown || "";
      const defaultTitle = (payload.seo_metadata?.seo_title || "").trim() || inferTitleFromMarkdown(articleMd) || payload.keyword || "Untitled";
      const titleInput = document.getElementById("wpTitle");
      if (titleInput) titleInput.value = defaultTitle;

      const sendBtn = document.getElementById("wpSendBtn");
      const modalStatus = document.getElementById("wpModalStatus");

      async function setStatus(text, type) {
        if (!modalStatus) return;
        modalStatus.textContent = text || "";
        modalStatus.classList.remove("error", "loading");
        if (type) modalStatus.classList.add(type);
      }

      if (sendBtn) {
        sendBtn.addEventListener("click", async () => {
          try {
            await setStatus("Creating draft…", "loading");
            sendBtn.disabled = true;

            const siteUrl = String(document.getElementById("wpSiteUrl")?.value || "").trim();
            const username = String(document.getElementById("wpUsername")?.value || "").trim();
            const appPassword = String(document.getElementById("wpAppPassword")?.value || "").trim();
            const title = String(document.getElementById("wpTitle")?.value || "").trim();

            const gateway = getApiGatewayConfig();
            if (!gateway.enabled) throw new Error("Enable ‘Use API endpoint’ in Settings to publish to WordPress.");

            const html = marked.parse(articleMd);
            const endpoint = `${gateway.baseUrl.replace(/\/+$/, "")}/v1/publish/wordpress`;

            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ siteUrl, username, appPassword, title, html })
            });

            const text = await res.text();
            let data = null;
            try {
              data = text ? JSON.parse(text) : null;
            } catch {
              data = null;
            }

            if (!res.ok) throw new Error(data?.error || data?.message || text || `Request failed (HTTP ${res.status}).`);

            const link = data?.post?.link;
            await setStatus(link ? `Draft created: ${link}` : "Draft created.");
          } catch (err) {
            await setStatus(err.message || String(err), "error");
          } finally {
            sendBtn.disabled = false;
          }
        });
      }

      return;
    }

    exportModalSubtitle.textContent = "Create a draft or publish via Ghost Admin API";

    const payload = getExportJsonPayload();
    const articleMd = payload.article_markdown || "";

    const defaultTitle = (payload.seo_metadata?.seo_title || "").trim() || inferTitleFromMarkdown(articleMd) || payload.keyword || "Untitled";
    const defaultTags = String(payload.seo_metadata?.secondary_keywords || "").trim();

    const saved = loadGhostSettings();

    exportModalBody.innerHTML = `
      <p class="small-note">
        This creates a <strong>draft</strong> in Ghost via your API gateway. Enable <strong>Use API endpoint</strong> in Settings for reliability (CORS).
      </p>

      <label class="field-label" for="ghostAdminUrl">
        Ghost Admin API URL
        <span class="field-help">Example: https://your-site.com (or https://your-site.com/ghost)</span>
      </label>
      <input type="url" id="ghostAdminUrl" class="field-input" placeholder="https://your-site.com" autocomplete="off" value="${saved.url.replace(/"/g, "&quot;")}">

      <label class="field-label" for="ghostAdminKey">
        Ghost Admin API key
        <span class="field-help">Format: <code>&lt;id&gt;:&lt;secret&gt;</code> (found in Ghost Admin → Integrations).</span>
      </label>
      <input type="password" id="ghostAdminKey" class="field-input" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx:yyyyyyyy..." autocomplete="off" value="${saved.key.replace(/"/g, "&quot;")}">

      <label class="checkbox-row">
        <input type="checkbox" id="ghostRemember" ${saved.remember ? "checked" : ""}>
        <span>Remember Ghost credentials in this browser</span>
      </label>

      <div class="settings-divider"></div>

      <label class="field-label" for="ghostTitle">Title</label>
      <input type="text" id="ghostTitle" class="field-input" value="${defaultTitle.replace(/"/g, "&quot;")}">

      <label class="field-label" for="ghostTags">
        Tags (comma-separated)
        <span class="field-help">We’ll create tags by name if they don’t exist yet.</span>
      </label>
      <input type="text" id="ghostTags" class="field-input" placeholder="seo, marketing" value="${defaultTags.replace(/"/g, "&quot;")}">

      <label class="field-label" for="ghostFeatureImage">
        Feature image URL (optional)
        <span class="field-help">Must be a publicly accessible image URL (https://...).</span>
      </label>
      <input type="url" id="ghostFeatureImage" class="field-input" placeholder="https://.../cover.jpg" autocomplete="off">

      <label class="checkbox-row">
        <input type="checkbox" id="ghostPublish">
        <span>Publish immediately</span>
      </label>

      <p class="status-text" id="ghostModalStatus"></p>

      <div class="config-actions">
        <button type="button" id="ghostSendBtn" class="btn-primary">Send to Ghost</button>
        <button type="button" id="ghostCopyHtmlBtn" class="btn-ghost">Copy HTML</button>
      </div>

      <p class="small-note">
        Note: If your Ghost is on a different domain, the browser may block this request due to CORS.
        In that case, use a same-origin setup or an API gateway.
      </p>
    `;

    exportModal.classList.add("open");
    exportModal.setAttribute("aria-hidden", "false");

    const urlInput = document.getElementById("ghostAdminUrl");
    const keyInput = document.getElementById("ghostAdminKey");
    const rememberInput = document.getElementById("ghostRemember");
    const titleInput = document.getElementById("ghostTitle");
    const tagsInput = document.getElementById("ghostTags");
    const featureImageInput = document.getElementById("ghostFeatureImage");
    const publishInput = document.getElementById("ghostPublish");
    const sendBtn = document.getElementById("ghostSendBtn");
    const copyHtmlBtn = document.getElementById("ghostCopyHtmlBtn");
    const modalStatus = document.getElementById("ghostModalStatus");

    function setModalStatus(text, { error = false } = {}) {
      if (!modalStatus) return;
      modalStatus.textContent = text;
      modalStatus.classList.toggle("error", !!error);
      modalStatus.classList.toggle("loading", false);
    }

    function getArticleHtml() {
      const md = articleMarkdown || (outputArea ? outputArea.value : "") || "";
      if (window.marked && typeof window.marked.parse === "function") {
        return window.marked.parse(md);
      }
      return `<pre>${md.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
    }

    if (copyHtmlBtn) {
      copyHtmlBtn.addEventListener("click", async () => {
        try {
          const html = getArticleHtml();
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(html);
            setModalStatus("HTML copied to clipboard.");
            return;
          }
          fallbackCopy(html);
          setModalStatus("HTML copied.");
        } catch (err) {
          console.error("Copy HTML error", err);
          setModalStatus("Could not copy HTML.", { error: true });
        }
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener("click", async () => {
        try {
          if (!urlInput || !keyInput) return;
          const url = urlInput.value.trim();
          const key = keyInput.value.trim();
          const remember = rememberInput ? rememberInput.checked : false;

          persistGhostSettings({ url, key, remember });

          const title = titleInput ? titleInput.value.trim() : "";
          const tags = tagsInput ? parseTagsCsv(tagsInput.value) : [];
          const featureImage = featureImageInput ? featureImageInput.value.trim() : "";
          const publish = publishInput ? publishInput.checked : false;

          const html = getArticleHtml();

          setModalStatus(publish ? "Publishing…" : "Creating draft…");
          modalStatus?.classList.add("loading");
          sendBtn.disabled = true;

          const exportPayload = getExportJsonPayload();
          const metaTitle = (exportPayload?.seo_metadata?.seo_title || "").trim();
          const metaDescription = (exportPayload?.seo_metadata?.meta_description || "").trim();

          const created = await sendPostToGhost({
            adminUrl: url,
            adminKey: key,
            title,
            html,
            tags,
            featureImage,
            publish,
            metaTitle,
            metaDescription,
            excerpt: metaDescription
          });

          const postUrl = created?.url || "";
          if (postUrl) {
            setModalStatus(`${publish ? "Published" : "Draft created"}: ${postUrl}`);
          } else {
            setModalStatus(publish ? "Published." : "Draft created.");
          }

          if (statusEl) {
            statusEl.textContent = publish ? "Sent to Ghost (published)." : "Sent to Ghost (draft).";
            statusEl.classList.remove("error");
          }
        } catch (err) {
          console.error("Ghost export error", err);
          setModalStatus(String(err?.message || err || "Ghost request failed."), { error: true });
        } finally {
          if (sendBtn) sendBtn.disabled = false;
          modalStatus?.classList.remove("loading");
        }
      });
    }
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
      if (action === "download-article") {
        downloadMarkdownWithMode("article");
      } else if (action === "download-article-images") {
        downloadMarkdownWithMode("article+images");
      } else if (action === "download-json") {
        downloadExportJson();
      } else if (action === "copy-json") {
        copyExportJson().catch((err) => {
          console.error("copyExportJson error", err);
          statusEl.textContent = "Could not copy JSON.";
          statusEl.classList.add("error");
        });
      } else if (action === "ghost" || action === "wordpress") {
        const { error } = getExportContent("article");
        if (error) {
          if (statusEl) {
            statusEl.textContent = error;
            statusEl.classList.add("error");
          }
          return;
        }
        try {
          if (statusEl) {
            statusEl.classList.remove("error");
            statusEl.textContent = action === "ghost" ? "Opening Ghost export…" : "Opening WordPress export…";
          }
          // Let the export menu close repaint before opening the modal on some browsers.
          setTimeout(() => openExportModal(action), 0);
        } catch (err) {
          console.error("openExportModal error", err);
          if (statusEl) {
            statusEl.textContent = `Export UI error: ${String(err?.message || err)}`;
            statusEl.classList.add("error");
          }
        }
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

  /* ---------- About modal ---------- */

  function openAboutModal() {
    if (!aboutModal) return;
    aboutModal.classList.add("open");
    aboutModal.setAttribute("aria-hidden", "false");
    if (closeAboutModalBtn) {
      closeAboutModalBtn.focus();
    }
  }

  function closeAboutModal() {
    if (!aboutModal) return;
    aboutModal.classList.remove("open");
    aboutModal.setAttribute("aria-hidden", "true");
  }

  if (aboutToggle) {
    aboutToggle.addEventListener("click", openAboutModal);
  }

  if (closeAboutModalBtn) {
    closeAboutModalBtn.addEventListener("click", closeAboutModal);
  }

  if (aboutModal) {
    aboutModal.addEventListener("click", (event) => {
      if (event.target === aboutModal) {
        closeAboutModal();
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
      articleMarkdown = "";
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
      articleMarkdown = entry.content || "";
      outputArea.value = articleMarkdown;
      updateMetrics();
      renderPreview(articleMarkdown);
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
        provider: getSelectedProvider ? getSelectedProvider() : CHAT_PROVIDERS.openrouter,
        baseUrl: getBaseUrl ? getBaseUrl() : "",
        model: modelSelect ? modelSelect.value : "",
        preset: presetSelect ? presetSelect.value : "",
        anonymousMode: !!(anonymousModeCheckbox && anonymousModeCheckbox.checked),
        expertMode: !!(expertToggle && expertToggle.checked),
        temperature: temperatureInput ? Number(temperatureInput.value) : 0.7,
        maxTokens: maxTokensInput ? Number(maxTokensInput.value) : 2048,
        topP: topPInput ? Number(topPInput.value) : 1,
        providerDefaults: (() => {
          const configs = loadProviderConfigs ? loadProviderConfigs() : {};
          const redacted = {};
          Object.entries(configs).forEach(([key, value]) => {
            if (!value || typeof value !== "object") return;
            redacted[key] = {
              model: value.model || "",
              baseUrl: value.baseUrl || ""
            };
          });
          return redacted;
        })()
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

    if (prefs.provider) {
      setProvider(prefs.provider);
    }
    if (prefs.baseUrl !== undefined) {
      setBaseUrl(prefs.baseUrl);
    }

    if (modelSelect && prefs.model) {
      modelSelect.value = prefs.model;
      persistModelForProvider(getSelectedProvider(), prefs.model);
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
      const provider = getSelectedProvider ? getSelectedProvider() : "provider";
      progressLabel.textContent = `Contacting ${provider}...`;
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

  function extractTextFromOpenAiLikeResponse(data) {
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : "";
  }

  function extractTextFromAnthropicResponse(data) {
    const parts = Array.isArray(data?.content) ? data.content : [];
    const text = parts
      .filter((p) => p && p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("");
    return text || "";
  }

  function extractTextFromGeminiResponse(data) {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim();
  }

  function extractTextFromOllamaResponse(data) {
    const content = data?.message?.content;
    return typeof content === "string" ? content : "";
  }

  function splitSystemFromMessages(messages = []) {
    const system = [];
    const rest = [];
    (messages || []).forEach((msg) => {
      if (!msg) return;
      if (msg.role === "system") system.push(msg.content || "");
      else rest.push(msg);
    });
    return { system: system.filter(Boolean).join("\n\n").trim(), messages: rest };
  }

  function coerceOpenAiMessages(inputMessages = [], includeSystem = true) {
    const { system, messages } = splitSystemFromMessages(inputMessages);
    if (!includeSystem || !system) return messages;
    return [{ role: "system", content: system }, ...messages];
  }

  function toAnthropicMessages(openAiMessages = []) {
    const { system, messages } = splitSystemFromMessages(openAiMessages);
    const mapped = messages
      .filter((m) => m && m.role && m.content)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: [{ type: "text", text: String(m.content) }]
      }));
    return { system, messages: mapped };
  }

  function toGeminiRequest(openAiMessages = []) {
    const { system, messages } = splitSystemFromMessages(openAiMessages);
    const contents = (messages || [])
      .filter((m) => m && m.role && m.content)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content) }]
      }));
    const request = { contents };
    if (system) {
      request.systemInstruction = { parts: [{ text: system }] };
    }
    return request;
  }

  function getApiGatewayConfig() {
    const enabled = useApiGatewayCheckbox ? useApiGatewayCheckbox.checked : readBoolStorage(STORAGE_KEY_USE_API_GATEWAY, false);
    const baseUrl = apiGatewayBaseUrlInput
      ? apiGatewayBaseUrlInput.value.trim()
      : (isAnonymous ? "" : (window.localStorage.getItem(STORAGE_KEY_API_GATEWAY_BASE_URL) || "").trim());

    return {
      enabled: !!enabled,
      baseUrl: baseUrl || "https://api.openseo.studio"
    };
  }

  async function callChatViaApiGateway({ provider, model, apiKey, baseUrl, body, messages, params } = {}) {
    const resolvedProvider = normalizeProvider(provider);
    const resolvedModel = model || body?.model;
    const resolvedMessages = messages || body?.messages || [];
    const resolvedParams = params || {};

    if (!resolvedModel) throw new Error("Missing model.");

    const { baseUrl: gatewayBase } = getApiGatewayConfig();
    const endpoint = `${gatewayBase.replace(/\/+$/, "")}/v1/generate`;

    const options = {
      temperature: body?.temperature ?? resolvedParams.temperature,
      max_tokens: body?.max_tokens ?? resolvedParams.max_tokens,
      top_p: body?.top_p ?? resolvedParams.top_p,
      frequency_penalty: body?.frequency_penalty ?? resolvedParams.frequency_penalty
    };

    const payload = {
      provider: resolvedProvider,
      model: resolvedModel,
      baseUrl,
      messages: coerceOpenAiMessages(resolvedMessages),
      options
    };

    const headers = { "Content-Type": "application/json" };
    const needsKey = resolvedProvider !== CHAT_PROVIDERS.ollama;
    if (needsKey) {
      const sanitizedKey = sanitizeApiKey(apiKey);
      if (!sanitizedKey) throw new Error("Invalid API key.");
      headers.Authorization = `Bearer ${sanitizedKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      let message = `API error ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.error || parsed?.message || message;
      } catch {
        if (text && text.trim()) message = text.slice(0, 400);
      }
      throw new Error(message);
    }

    const data = await response.json();
    const content = typeof data?.text === "string" ? data.text : "";
    if (!content) throw new Error("Empty or unexpected API response.");
    return content;
  }

  async function callChatProvider({ provider, model, apiKey, baseUrl, body, messages, params } = {}) {
    const resolvedProvider = normalizeProvider(provider);

    // OpenRouter is BYOK and should work out-of-the-box with only an API key.
    // The optional API gateway is meant for self-hosted deployments; if it's enabled
    // in localStorage, it can accidentally break OpenRouter calls (e.g. pointing to
    // a domain serving the static app, not an actual JSON API).
    // So: never route OpenRouter through the API gateway.
    const gateway = getApiGatewayConfig();
    if (gateway.enabled && resolvedProvider !== CHAT_PROVIDERS.openrouter) {
      return await callChatViaApiGateway({ provider: resolvedProvider, model, apiKey, baseUrl, body, messages, params });
    }

    
    const resolvedModel = model || body?.model;
    const resolvedMessages = messages || body?.messages || [];
    const resolvedParams = params || {};

    if (!resolvedModel) throw new Error("Missing model.");

    const common = {
      temperature: body?.temperature ?? resolvedParams.temperature,
      max_tokens: body?.max_tokens ?? resolvedParams.max_tokens,
      top_p: body?.top_p ?? resolvedParams.top_p,
      frequency_penalty: body?.frequency_penalty ?? resolvedParams.frequency_penalty
    };

    let url = "";
    let requestBody = {};
    const headers = { "Content-Type": "application/json" };

    if (resolvedProvider === CHAT_PROVIDERS.openrouter) {
      const sanitizedKey = sanitizeApiKey(apiKey);
      if (!sanitizedKey) throw new Error("Invalid API key.");
      url = OPENROUTER_URL;
      headers.Authorization = `Bearer ${sanitizedKey}`;
      requestBody = { ...body, model: resolvedModel, messages: coerceOpenAiMessages(resolvedMessages) };
    } else if (resolvedProvider === CHAT_PROVIDERS.openai) {
      const sanitizedKey = sanitizeApiKey(apiKey);
      if (!sanitizedKey) throw new Error("Invalid API key.");
      url = "https://api.openai.com/v1/chat/completions";
      headers.Authorization = `Bearer ${sanitizedKey}`;
      requestBody = {
        model: resolvedModel,
        messages: coerceOpenAiMessages(resolvedMessages),
        temperature: common.temperature,
        max_tokens: common.max_tokens,
        top_p: common.top_p,
        frequency_penalty: common.frequency_penalty
      };
    } else if (resolvedProvider === CHAT_PROVIDERS.anthropic) {
      const sanitizedKey = sanitizeApiKey(apiKey);
      if (!sanitizedKey) throw new Error("Invalid API key.");
      url = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = sanitizedKey;
      headers["anthropic-version"] = "2023-06-01";
      const mapped = toAnthropicMessages(resolvedMessages);
      requestBody = {
        model: resolvedModel,
        system: mapped.system || undefined,
        messages: mapped.messages,
        // Anthropic requires max_tokens
        max_tokens: Number.isFinite(Number(common.max_tokens)) ? Number(common.max_tokens) : 1024,
        temperature: common.temperature
      };
    } else if (resolvedProvider === CHAT_PROVIDERS.gemini) {
      const sanitizedKey = sanitizeApiKey(apiKey);
      if (!sanitizedKey) throw new Error("Invalid API key.");
      url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent?key=${encodeURIComponent(sanitizedKey)}`;
      requestBody = toGeminiRequest(resolvedMessages);
      // generationConfig is optional.
      requestBody.generationConfig = {
        temperature: common.temperature,
        topP: common.top_p,
        maxOutputTokens: common.max_tokens
      };
    } else if (resolvedProvider === CHAT_PROVIDERS.ollama) {
      const base = (baseUrl || "").trim().replace(/\/+$/, "");
      if (!base) throw new Error("Missing baseUrl for Ollama.");
      url = `${base}/api/chat`;
      requestBody = {
        model: resolvedModel,
        messages: coerceOpenAiMessages(resolvedMessages),
        stream: false,
        options: {
          temperature: common.temperature,
          top_p: common.top_p,
          num_predict: common.max_tokens
        }
      };
    } else {
      throw new Error(`Unsupported provider: ${resolvedProvider}`);
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const text = await response.text();
      let message = `API error ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        message =
          parsed?.error?.message ||
          parsed?.message ||
          parsed?.error ||
          message;
      } catch {
        if (text && text.trim()) message = text.slice(0, 400);
      }
      throw new Error(message);
    }

    const data = await response.json();

    const content = (() => {
      if (resolvedProvider === CHAT_PROVIDERS.anthropic) return extractTextFromAnthropicResponse(data);
      if (resolvedProvider === CHAT_PROVIDERS.gemini) return extractTextFromGeminiResponse(data);
      if (resolvedProvider === CHAT_PROVIDERS.ollama) return extractTextFromOllamaResponse(data);
      return extractTextFromOpenAiLikeResponse(data);
    })();

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
    const provider = getSelectedProvider();
    const apiKey = sanitizeApiKey(apiKeyInput.value);
    apiKeyInput.value = apiKey;
    const baseUrl = getBaseUrl();
    const model = modelSelect.value;

    const needsKey = provider !== CHAT_PROVIDERS.ollama;
    const needsBaseUrl = provider === CHAT_PROVIDERS.ollama;

    if (!model || (needsKey && !apiKey) || (needsBaseUrl && !baseUrl)) {
      if (!silent) {
        statusEl.textContent = "Please provide provider settings (API key / base URL) and select a model before generating a plan.";
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
      const content = await callChatProvider({ provider, model, apiKey, baseUrl, body });
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

      const provider = getSelectedProvider();
      const apiKey = sanitizeApiKey(apiKeyInput.value);
      apiKeyInput.value = apiKey;
      const baseUrl = getBaseUrl();

      const needsKey = provider !== CHAT_PROVIDERS.ollama;
      const needsBaseUrl = provider === CHAT_PROVIDERS.ollama;

      if ((needsKey && !apiKey) || (needsBaseUrl && !baseUrl)) {
        statusEl.textContent = needsBaseUrl
          ? "Please provide your Ollama base URL in the settings menu."
          : "Please provide your API key in the settings menu.";
        statusEl.classList.add("error");
        if (menuPanel) {
          menuPanel.classList.add("open");
          menuPanel.setAttribute("aria-hidden", "false");
        }
        showWelcomeIfNeeded();
        return;
      }

      const keyword = keywordInput.value.trim();
      handleKeywordChange(keyword);
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
        statusEl.textContent = "Please select a model in the settings.";
        statusEl.classList.add("error");
        if (menuPanel) {
          menuPanel.classList.add("open");
          menuPanel.setAttribute("aria-hidden", "false");
        }
        return;
      }

      if (provider !== CHAT_PROVIDERS.ollama && apiKey) {
        persistApiKeyForProvider(provider, apiKey);
      } else {
        persistApiKeyForProvider(provider, "");
      }

      const planText = planEditor ? planEditor.value : "";

      // Optional: web research context (via Perplexity through the API endpoint)
      let researchBlock = "";
      if (useWebResearchCheckbox && useWebResearchCheckbox.checked) {
        try {
          // If no cache yet, fetch automatically.
          if (!webResearchCache) {
            if (webResearchBtn) webResearchBtn.disabled = true;
            setWebResearchStatus("Auto-fetching web research…", { loading: true });
            await fetchWebResearch({ keyword, planText, languageConfig });
            setWebResearchStatus("Web research ready.", { loading: false });
          }
          if (webResearchCache) {
            researchBlock = `\n\n---\n\n## Latest web research (with sources)\n\n${webResearchCache}\n\n---\n`;
          }
        } catch (err) {
          console.error("auto web research error", err);
          setWebResearchStatus(String(err?.message || err), { error: true, loading: false });
          // Continue without research.
        } finally {
          if (webResearchBtn) webResearchBtn.disabled = false;
        }
      }

      const userPrompt = buildUserPrompt({
        keyword,
        languageConfig,
        tone,
        length,
        extra: `${extra}${researchBlock}`.trim(),
        planText
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
          statusEl.textContent = `TOC enabled. Contacting ${getSelectedProvider()}...`;
        } else {
          statusEl.textContent = `Contacting ${getSelectedProvider()}...`;
        }
        statusEl.classList.add("loading");
        statusEl.classList.remove("error");

        endProgress = startProgress(length);
        statusEl.textContent = `${statusEl.textContent} ETA ${etaLabel ? etaLabel.textContent : "~"}`;

        const content = await callChatProvider({ provider, model, apiKey, baseUrl, body });

        articleMarkdown = content;
        outputArea.value = articleMarkdown;
        updateMetrics();
        renderPreview(articleMarkdown);
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
    lastSeoMetadata = metadata;
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

    const provider = getSelectedProvider();
    const apiKey = sanitizeApiKey(apiKeyInput.value);
    apiKeyInput.value = apiKey;
    const baseUrl = getBaseUrl();

    const needsKey = provider !== CHAT_PROVIDERS.ollama;
    const needsBaseUrl = provider === CHAT_PROVIDERS.ollama;

    if ((needsKey && !apiKey) || (needsBaseUrl && !baseUrl)) {
      statusEl.textContent = needsBaseUrl
        ? "Please provide your Ollama base URL in the settings menu."
        : "Please provide your API key in the settings menu.";
      statusEl.classList.add("error");
      return;
    }

    const keyword = keywordInput.value.trim();
    handleKeywordChange(keyword);
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
      const raw = await callChatProvider({ provider: getSelectedProvider(), model, apiKey, baseUrl: getBaseUrl(), body });
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

  /* ---------- Image prompt generation ---------- */

  async function generateImagePrompts() {
    statusEl.textContent = "";
    statusEl.classList.remove("error", "loading");

    const provider = getSelectedProvider();
    const apiKey = sanitizeApiKey(apiKeyInput.value);
    apiKeyInput.value = apiKey;
    const baseUrl = getBaseUrl();

    const needsKey = provider !== CHAT_PROVIDERS.ollama;
    const needsBaseUrl = provider === CHAT_PROVIDERS.ollama;

    if ((needsKey && !apiKey) || (needsBaseUrl && !baseUrl)) {
      statusEl.textContent = needsBaseUrl
        ? "Please provide your Ollama base URL in the settings menu."
        : "Please provide your API key in the settings menu.";
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
      statusEl.textContent = "Please select a model before generating image prompts.";
      statusEl.classList.add("error");
      return;
    }

    const languageConfig = getSelectedLanguage();
    const options = normalizeGenerationOptions(generationOptions);
    const optionalHeadings = getPlanSectionHeadings(4);
    const userPrompt = buildImagePromptsUserPrompt({
      keyword,
      uiLanguage: languageConfig.promptName,
      stylePreset: options.imageStylePreset,
      imageCount: options.imageCount,
      includeDiagramPrompt: options.includeDiagramPrompt,
      includeNegativePrompt: options.includeNegativePrompt,
      optionalHeadings
    });

    const temperature = expertToggle && expertToggle.checked ? Number(temperatureInput.value) || 0.6 : 0.6;
    const maxTokensRaw = expertToggle && expertToggle.checked ? Number(maxTokensInput.value) || 900 : 900;
    const maxTokens = Math.min(Math.max(700, maxTokensRaw), 1200);
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
          content: buildImagePromptsSystemPrompt()
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature,
      top_p,
      frequency_penalty,
      max_tokens: maxTokens
    };

    let endProgress;
    try {
      if (generateImagePromptsBtn) {
        generateImagePromptsBtn.disabled = true;
        generateImagePromptsBtn.textContent = "Generating...";
      }
      statusEl.textContent = `Contacting ${getSelectedProvider()}...`;
      statusEl.classList.remove("error");
      statusEl.classList.add("loading");

      endProgress = startProgress("short");
      statusEl.textContent = "Generating image prompts...";

      const content = await callChatProvider({ provider, model, apiKey, baseUrl, body });

      imagePromptsMarkdown = content.trim();
      statusEl.textContent = "Image prompts generated. Available in Export.";
      statusEl.classList.remove("loading");

      recordCost(model, Math.min(maxTokens, 800));
      updateEstimates();
    } catch (err) {
      console.error(err);
      statusEl.textContent = `Error generating image prompts: ${err.message}`;
      statusEl.classList.add("error");
      statusEl.classList.remove("loading");
    } finally {
      if (endProgress) endProgress(!statusEl.classList.contains("error"));
      if (generateImagePromptsBtn) {
        generateImagePromptsBtn.disabled = false;
        generateImagePromptsBtn.textContent = "Generate image prompts";
      }
    }
  }

  if (generateImagePromptsBtn) {
    generateImagePromptsBtn.addEventListener("click", generateImagePrompts);
  }

  /* ---------- Selection regeneration ---------- */

  async function regenerateSelection({ changeTone = false } = {}) {
    if (!outputArea) return;
    const provider = getSelectedProvider();
    const apiKey = sanitizeApiKey(apiKeyInput.value);
    apiKeyInput.value = apiKey;
    const baseUrl = getBaseUrl();

    const needsKey = provider !== CHAT_PROVIDERS.ollama;
    const needsBaseUrl = provider === CHAT_PROVIDERS.ollama;

    if ((needsKey && !apiKey) || (needsBaseUrl && !baseUrl)) {
      statusEl.textContent = needsBaseUrl
        ? "Ollama base URL required to regenerate."
        : "API key required to regenerate.";
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
      const replacement = await callChatProvider({
        provider,
        model: modelSelect.value,
        apiKey,
        baseUrl,
        body
      });
      const newValue = `${outputArea.value.slice(0, start)}${replacement.trim()}${outputArea.value.slice(end)}`;
      outputArea.value = newValue;
      articleMarkdown = newValue;
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

const IMAGE_STYLE_PRESETS = {
  "modern-illustration": "modern flat illustration, clean vector shapes, soft gradients, subtle texture, balanced negative space",
  "isometric-tech": "isometric perspective, clean tech aesthetic, crisp geometry, subtle lighting, organized layout",
  photorealistic: "photorealistic, natural lighting, realistic materials, shallow depth of field, high detail",
  "minimalist-diagram": "minimalist diagram style, simple geometric shapes, restrained palette, clear structure",
  "3d-render": "3D render, product-like studio lighting, realistic materials, clean backdrop, soft shadows"
};

function buildImagePromptsSystemPrompt() {
  return [
    "You are an expert visual prompt engineer. You write high-quality prompts for AI image generators.",
    "Rules:",
    "- Do NOT generate images, only text prompts.",
    "- No emojis.",
    "- No copyrighted characters, brand logos, or trademarked designs.",
    "- Avoid text overlays: explicitly include 'no text, no watermark, no logo'.",
    "- Prompts must be usable for Midjourney, Stable Diffusion, and DALL·E.",
    "- Output ONLY Markdown with the required structure."
  ].join("\n");
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

function buildImagePromptsUserPrompt({
  keyword,
  uiLanguage,
  stylePreset,
  imageCount,
  includeDiagramPrompt,
  includeNegativePrompt,
  optionalHeadings
}) {
  const styleCue = IMAGE_STYLE_PRESETS[stylePreset] || IMAGE_STYLE_PRESETS["modern-illustration"];
  const headings = Array.isArray(optionalHeadings) ? optionalHeadings.filter(Boolean) : [];
  const headingList = headings.length ? headings.join(" | ") : "Section 1 | Section 2 | Section 3 | Section 4";

  return [
    `Topic keyword: "${keyword}".`,
    `UI language for headings and notes: ${uiLanguage}.`,
    "Headings and notes must be written only in the UI language.",
    "Prompts themselves must be written in English for compatibility.",
    `Style preset: ${styleCue}.`,
    `Section image count: ${imageCount}.`,
    `Use up to 4 section titles from this list if available: ${headingList}.`,
    "If not enough section titles are provided, create generic section labels.",
    "Output must be Markdown only with this structure:",
    "## Image prompts",
    "### Featured image",
    "Prompt: \"...\"",
    "Notes:",
    "- ...",
    "- ...",
    "- ...",
    "### Section images",
    "#### Section image 1 — {title}",
    "Prompt: \"...\"",
    "Repeat for the required number of section images.",
    includeDiagramPrompt ? "### Diagram / infographic\nPrompt: \"...\"" : "",
    includeNegativePrompt ? "### Negative prompt\nNegative: \"...\"" : "",
    "Prompt quality requirements:",
    "- Include visual style cues based on the style preset.",
    "- Always include: no text, no watermark, no logo.",
    "- Avoid brand names and copyrighted characters.",
    "- Keep each prompt in a single quoted line."
  ]
    .filter(Boolean)
    .join("\n");
}
