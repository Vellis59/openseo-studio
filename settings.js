(function () {
  const STORAGE_KEY_API = "openseo_openrouter_key";
  const STORAGE_KEY_MODEL = "openseo_default_model";
  const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
  const OPENROUTER_APP_TITLE = "OpenSEO Studio";

  function getReferer() {
    return window.location?.origin || window.location?.href || "";
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
    const statusEl = document.getElementById("settingsStatus");

    if (!apiKeyInput || !rememberKeyCheckbox || !modelSelect || !resetStorageBtn || !statusEl) return;

    const setStatus = (message, mode = "") => {
      statusEl.textContent = message;
      statusEl.classList.remove("error", "loading");
      if (mode) statusEl.classList.add(mode);
    };

    const setModelPlaceholder = (message, disabled = true) => {
      modelSelect.innerHTML = "";
      const option = document.createElement("option");
      option.value = "";
      option.textContent = message;
      modelSelect.appendChild(option);
      modelSelect.disabled = disabled;
    };

    const populateModels = (models) => {
      modelSelect.innerHTML = "";
      const sorted = models
        .filter((m) => m?.id)
        .sort((a, b) => a.id.localeCompare(b.id));

      sorted.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.name || model.id;
        option.title = model.description || model.id;
        modelSelect.appendChild(option);
      });

      const storedModel = getModel();
      if (storedModel && sorted.some((m) => m.id === storedModel)) {
        modelSelect.value = storedModel;
      } else if (sorted[0]) {
        modelSelect.value = sorted[0].id;
        setModel(sorted[0].id);
      }

      modelSelect.disabled = false;
    };

    const fetchModels = async (apiKey) => {
      if (!apiKey) {
        setModelPlaceholder("Enter your API key to load models");
        setStatus("Enter your API key to load models.");
        return;
      }

      setStatus("Loading models from OpenRouter...", "loading");
      setModelPlaceholder("Loading models...", true);

      try {
        const response = await fetch(OPENROUTER_MODELS_URL, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "X-Title": OPENROUTER_APP_TITLE,
            "HTTP-Referer": getReferer()
          }
        });

        if (!response.ok) {
          const text = await response.text();
          let message = `Unable to fetch models (${response.status}).`;
          try {
            const parsed = JSON.parse(text);
            if (parsed?.error?.message) message = parsed.error.message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const payload = await response.json();
        const models = Array.isArray(payload?.data) ? payload.data : [];

        if (!models.length) {
          setModelPlaceholder("No models available", true);
          setStatus("No models returned by OpenRouter.");
          setModel("");
          return;
        }

        populateModels(models);
        setStatus("Models loaded. Choose your preferred model.");
      } catch (err) {
        console.error("settings: fetchModels", err);
        setModelPlaceholder("Could not load models", true);
        setStatus(`Could not load models: ${err.message}`, "error");
        setModel("");
      }
    };

    const populateFromStorage = () => {
      const storedKey = getApiKey();
      apiKeyInput.value = storedKey;
      rememberKeyCheckbox.checked = !!window.localStorage.getItem(STORAGE_KEY_API);

      if (!storedKey) {
        setModelPlaceholder("Enter your API key to load models");
        setStatus("Enter your API key to load models.");
        return;
      }

      fetchModels(storedKey);
    };

    populateFromStorage();

    const saveDebounced = (() => {
      let timer = null;
      return (message = "Saved.") => {
        clearTimeout(timer);
        timer = setTimeout(() => setStatus(message), 150);
      };
    })();

    let fetchTimer = null;

    const handleApiKeyChange = () => {
      const key = apiKeyInput.value.trim();
      setApiKey(key, rememberKeyCheckbox.checked);

      clearTimeout(fetchTimer);
      fetchTimer = setTimeout(() => fetchModels(key), 300);

      saveDebounced(key ? "API key updated." : "API key cleared.");
    };

    apiKeyInput.addEventListener("input", handleApiKeyChange);
    rememberKeyCheckbox.addEventListener("change", handleApiKeyChange);

    modelSelect.addEventListener("change", () => {
      setModel(modelSelect.value);
      saveDebounced("Model saved.");
    });

    resetStorageBtn.addEventListener("click", () => {
      clearAll();
      apiKeyInput.value = "";
      rememberKeyCheckbox.checked = false;
      setModelPlaceholder("Enter your API key to load models");
      setStatus("Cleared.");
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
