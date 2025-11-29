const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

const MODEL_PRICING = {
  default: { prompt: 0.003, completion: 0.006 }
};

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

  const regenSelectionBtn = document.getElementById("regenSelectionBtn");
  const toneSelectionBtn = document.getElementById("toneSelectionBtn");

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

  const STORAGE_KEY_API = "openseo_openrouter_key";
  const STORAGE_KEY_MODEL = "openseo_default_model";
  const STORAGE_KEY_THEME = "openseo_color_theme";
  const STORAGE_KEY_HISTORY = "openseo_article_history";
  const STORAGE_KEY_SPEND = "openseo_monthly_spend";

  const MAX_HISTORY_ITEMS = 20;

  let isAnonymous = false;
  let encryptedKeyPayload = null;
  let historyCache = [];

  function setItemGuarded(key, value) {
    if (isAnonymous) return;
    window.localStorage.setItem(key, value);
  }

  function removeItem(key) {
    window.localStorage.removeItem(key);
  }

  function clearAppStorage() {
    [STORAGE_KEY_API, STORAGE_KEY_MODEL, STORAGE_KEY_THEME, STORAGE_KEY_HISTORY, STORAGE_KEY_SPEND].forEach((key) => {
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
      const key = apiKeyInput.value.trim();
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
      const key = apiKeyInput.value.trim();
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
    });
    updateMetrics();
    renderPreview(outputArea.value);
  }

  [keywordInput, lengthSelect, languageSelect, toneSelect, extraInput].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", updateEstimates);
    el.addEventListener("input", updateEstimates);
  });

  if (planEditor) {
    planEditor.addEventListener("input", updateEstimates);
  }

  [modelSelect, temperatureInput, maxTokensInput, topPInput, frequencyPenaltyInput].forEach((el) => {
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
      statusEl.textContent = `Loaded “${entry.title}” from history.`;
      statusEl.classList.remove("error", "loading");
      closeHistoryOverlay();
    });
  }

  /* ---------- Config import/export ---------- */

  function buildConfigSnapshot() {
    return {
      version: "0.6.0",
      preferences: {
        theme: resolveTheme(),
        model: modelSelect ? modelSelect.value : "",
        language: languageSelect ? languageSelect.value : "",
        tone: toneSelect ? toneSelect.value : "",
        length: lengthSelect ? lengthSelect.value : "",
        extra: extraInput ? extraInput.value : "",
        preset: presetSelect ? presetSelect.value : "",
        promptMode: promptModeSelect ? promptModeSelect.value : "standard",
        toc: tocCheckbox ? tocCheckbox.checked : false,
        anonymousMode: !!(anonymousModeCheckbox && anonymousModeCheckbox.checked),
        expertMode: !!(expertToggle && expertToggle.checked),
        temperature: temperatureInput ? Number(temperatureInput.value) : 0.7,
        maxTokens: maxTokensInput ? Number(maxTokensInput.value) : 2048,
        topP: topPInput ? Number(topPInput.value) : 1,
        frequencyPenalty: frequencyPenaltyInput ? Number(frequencyPenaltyInput.value) : 0
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

    if (languageSelect && prefs.language) languageSelect.value = prefs.language;
    if (toneSelect && prefs.tone) toneSelect.value = prefs.tone;
    if (lengthSelect && prefs.length) lengthSelect.value = prefs.length;
    if (extraInput && typeof prefs.extra === "string") extraInput.value = prefs.extra;
    if (presetSelect && prefs.preset !== undefined) presetSelect.value = prefs.preset;
    if (promptModeSelect && prefs.promptMode) promptModeSelect.value = prefs.promptMode;
    if (tocCheckbox && typeof prefs.toc === "boolean") tocCheckbox.checked = prefs.toc;
    if (expertToggle && typeof prefs.expertMode === "boolean") {
      expertToggle.checked = prefs.expertMode;
      setExpertMode(prefs.expertMode);
    }
    if (temperatureInput && prefs.temperature !== undefined) temperatureInput.value = prefs.temperature;
    if (maxTokensInput && prefs.maxTokens !== undefined) maxTokensInput.value = prefs.maxTokens;
    if (topPInput && prefs.topP !== undefined) topPInput.value = prefs.topP;
    if (frequencyPenaltyInput && prefs.frequencyPenalty !== undefined) {
      frequencyPenaltyInput.value = prefs.frequencyPenalty;
    }

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
    const apiKey = apiKeyInput.value.trim();
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
          content: `Keyword: ${keyword}. Tone: ${toneSelect.value}. Language: ${languageSelect.value}. Length: ${length}. Outline only.`
        }
      ]
    };

    const temperature = expertToggle && expertToggle.checked ? Number(temperatureInput.value) || 0.7 : 0.5;
    const maxTokens = expertToggle && expertToggle.checked ? Number(maxTokensInput.value) || 512 : 512;
    const top_p = expertToggle && expertToggle.checked ? Number(topPInput.value) || 1 : 1;
    const frequency_penalty = expertToggle && expertToggle.checked ? Number(frequencyPenaltyInput.value) || 0 : 0;

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

      if (planEditor && !planEditor.value.trim()) {
        await generatePlan({ silent: true });
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
        persistApiKey(apiKey);
      } else {
        removeItem(STORAGE_KEY_API);
      }

      const userPrompt = buildUserPrompt({
        keyword,
        language,
        tone,
        length,
        extra,
        planText: planEditor ? planEditor.value : ""
      });

      const temperature = expertToggle && expertToggle.checked ? Number(temperatureInput.value) || 0.7 : 0.7;
      const maxTokens = expertToggle && expertToggle.checked ? Number(maxTokensInput.value) || undefined : undefined;
      const top_p = expertToggle && expertToggle.checked ? Number(topPInput.value) || 1 : 1;
      const frequency_penalty = expertToggle && expertToggle.checked ? Number(frequencyPenaltyInput.value) || 0 : 0;

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

        if (tocCheckbox && tocCheckbox.checked) {
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

  /* ---------- Selection regeneration ---------- */

  async function regenerateSelection({ changeTone = false } = {}) {
    if (!outputArea) return;
    const apiKey = apiKeyInput.value.trim();
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
    const frequency_penalty = expertToggle && expertToggle.checked ? Number(frequencyPenaltyInput.value) || 0 : 0;

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
function buildUserPrompt({ keyword, language, tone, length, extra, planText }) {
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

  if (planText) {
    lines.push("Use the following outline and generate each section sequentially:");
    lines.push(planText);
    lines.push("Expand each heading with detailed, concise paragraphs.");
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
