(function () {
  const STORAGE_KEY_API = "openseo_openrouter_key";
  const STORAGE_KEY_MODEL = "openseo_default_model";
  const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
  const OPENROUTER_APP_TITLE = "OpenSEO Studio";
  const OPENROUTER_DEFAULT_REFERRER = "https://openseo.studio";

  async function loadOpenRouterModels(apiKey) {
    if (!apiKey) throw new Error("Missing API key");
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    console.log("Loading models...", res.status);

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Models fetch failed ${res.status}: ${text.slice(0, 200)}`);
    }

    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error(`Models response not JSON: ${text.slice(0, 200)}`); }

    const arr = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
    const ids = arr.map(x => x && x.id).filter(Boolean);

    console.log("Models loaded:", ids.length);

    if (!ids.length) throw new Error("No models returned by OpenRouter (empty list).");

    return ids;
  }

  function getReferer() {
    const origin = window.location?.origin || "";
    const href = window.location?.href || "";

    if (!origin || origin === "null" || origin.startsWith("file:")) {
      return OPENROUTER_DEFAULT_REFERRER;
    }

    return origin || href || OPENROUTER_DEFAULT_REFERRER;
  }

  let sessionApiKey = "";

  function decodeLegacyApiKey(raw) {
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.method === "base64" && parsed.cipher) {
        return atob(parsed.cipher);
      }
      return "";
    } catch (err) {
      return raw;
    }
  }

  function getApiKey() {
    const raw = window.localStorage.getItem(STORAGE_KEY_API);
    if (raw) return decodeLegacyApiKey(raw) || raw;
    return sessionApiKey || "";
  }

  function getModel(defaultValue = "") {
    const stored = window.localStorage.getItem(STORAGE_KEY_MODEL);
    return stored || defaultValue || "";
  }

  function setApiKey(apiKey, remember) {
    sessionApiKey = apiKey || "";
    if (!remember) {
      window.localStorage.removeItem(STORAGE_KEY_API);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY_API, apiKey || "");
  }

  function setModel(model) {
    if (!model) {
      window.localStorage.removeItem(STORAGE_KEY_MODEL);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY_MODEL, model);
  }

  function setStatusMessage(statusEl, message, mode = "") {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove("error", "loading");
    if (mode) statusEl.classList.add(mode);
  }

  function setModelPlaceholder(modelSelect, message, disabled = true) {
    if (!modelSelect) return;
    modelSelect.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = message;
    modelSelect.appendChild(option);
    modelSelect.disabled = disabled;
  }

  function populateModelSelect(modelSelect, models) {
    const normalized = models
      .map((m) => (typeof m === "string" ? { id: m } : m))
      .filter((m) => m?.id)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (modelSelect) {
      modelSelect.innerHTML = "";
      normalized.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.name || model.id;
        option.title = model.description || model.id;
        modelSelect.appendChild(option);
      });
    }

    const storedModel = getModel();
    let selectedModel = storedModel && normalized.some((m) => m.id === storedModel) ? storedModel : "";

    if (!selectedModel && normalized[0]) {
      selectedModel = normalized[0].id;
    }

    if (selectedModel) {
      if (modelSelect) {
        modelSelect.value = selectedModel;
        modelSelect.disabled = false;
      }
      setModel(selectedModel);
    } else if (modelSelect) {
      modelSelect.disabled = false;
    }

    return selectedModel;
  }

  async function loadModels(apiKey, { modelSelect, statusEl } = {}) {
    const selectEl = modelSelect || document.getElementById("modelSelect");
    const statusTarget =
      statusEl || document.getElementById("settingsStatus") || document.getElementById("status");

    if (!apiKey) {
      setModelPlaceholder(selectEl, "Enter your API key to load models");
      setStatusMessage(statusTarget, "Enter your API key to load models.");
      setModel("");
      return { models: [], selectedModel: "" };
    }

    setStatusMessage(statusTarget, "Loading models from OpenRouter...", "loading");
    setModelPlaceholder(selectEl, "Loading models...", true);

    try {
      const ids = await loadOpenRouterModels(apiKey);
      const selectedModel = populateModelSelect(selectEl, ids);
      setStatusMessage(statusTarget, "Models loaded. Choose your preferred model.");
      return { models: ids, selectedModel };
    } catch (err) {
      console.error("loadModels error", {
        endpoint: OPENROUTER_MODELS_URL,
        message: err?.message || "unknown error"
      });
      setModelPlaceholder(selectEl, "Could not load models", true);
      setStatusMessage(statusTarget, `Could not load models: ${err.message}`, "error");
      setModel("");
      throw err;
    }
  }

  function clearAll() {
    sessionApiKey = "";
    window.localStorage.removeItem(STORAGE_KEY_API);
    window.localStorage.removeItem(STORAGE_KEY_MODEL);
  }

  function bindParametersPage() {
    const apiKeyInput = document.getElementById("apiKeyInput");
    const rememberKeyCheckbox = document.getElementById("rememberKeyCheckbox");
    const modelSelect = document.getElementById("modelSelect");
    const resetStorageBtn = document.getElementById("resetStorageBtn");
    const refreshModelsBtn = document.getElementById("refreshModelsBtn");
    const statusEl = document.getElementById("settingsStatus");

    if (!apiKeyInput || !rememberKeyCheckbox || !modelSelect || !resetStorageBtn || !statusEl) return;

    const populateFromStorage = () => {
      const storedKey = getApiKey();
      apiKeyInput.value = storedKey;
      rememberKeyCheckbox.checked = !!window.localStorage.getItem(STORAGE_KEY_API);

      if (!storedKey) {
        setModelPlaceholder(modelSelect, "Enter your API key to load models");
        setStatusMessage(statusEl, "Enter your API key to load models.");
        return;
      }

      loadModels(storedKey, { modelSelect, statusEl });
    };

    populateFromStorage();

    const saveDebounced = (() => {
      let timer = null;
      return (message = "Saved.") => {
        clearTimeout(timer);
        timer = setTimeout(() => setStatusMessage(statusEl, message), 150);
      };
    })();

    let fetchTimer = null;

    const handleApiKeyChange = () => {
      const key = apiKeyInput.value.trim();
      setApiKey(key, rememberKeyCheckbox.checked);

      clearTimeout(fetchTimer);
      fetchTimer = setTimeout(() => loadModels(key, { modelSelect, statusEl }), 300);

      saveDebounced(key ? "API key updated." : "API key cleared.");
    };

    apiKeyInput.addEventListener("input", handleApiKeyChange);
    rememberKeyCheckbox.addEventListener("change", handleApiKeyChange);

    modelSelect.addEventListener("change", () => {
      setModel(modelSelect.value);
      saveDebounced("Model saved.");
    });

    if (refreshModelsBtn) {
      refreshModelsBtn.addEventListener("click", () => {
        loadModels(apiKeyInput.value.trim(), { modelSelect, statusEl });
      });
    }

    resetStorageBtn.addEventListener("click", () => {
      clearAll();
      apiKeyInput.value = "";
      rememberKeyCheckbox.checked = false;
      setModelPlaceholder(modelSelect, "Enter your API key to load models");
      setStatusMessage(statusEl, "Cleared.");
    });
  }

  function ensureApiKeyOrExplain(statusEl) {
    if (!statusEl) return false;
    const key = getApiKey();
    if (key) return true;
    statusEl.innerHTML =
      'Please set your OpenRouter API key on the <a href="parameters.html">parameters page</a> before generating.';
    statusEl.classList.add("error");
    return false;
  }

  window.OSSSettings = {
    STORAGE_KEY_API,
    STORAGE_KEY_MODEL,
    getApiKey,
    getModel,
    setApiKey,
    setModel,
    loadOpenRouterModels,
    loadModels,
    clearAll,
    bindParametersPage,
    ensureApiKeyOrExplain
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("parametersRoot")) {
      bindParametersPage();
    }
  });
})();
