(function () {
  const STORAGE_KEY_API = "openseo_openrouter_key";
  const STORAGE_KEY_MODEL = "openseo_default_model";

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
    if (!raw) return "";
    return decodeLegacyApiKey(raw) || raw;
  }

  function getModel(defaultValue = "") {
    const stored = window.localStorage.getItem(STORAGE_KEY_MODEL);
    return stored || defaultValue || "";
  }

  function setApiKey(apiKey, remember) {
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

    const updateStatus = (message) => {
      statusEl.textContent = message;
    };

    const populateFromStorage = () => {
      const storedKey = getApiKey();
      apiKeyInput.value = storedKey;
      rememberKeyCheckbox.checked = !!storedKey;

      const storedModel = getModel();
      const optionExists = Array.from(modelSelect.options).some((opt) => opt.value === storedModel);
      modelSelect.value = optionExists ? storedModel : modelSelect.options[0]?.value || "";
    };

    populateFromStorage();

    const saveDebounced = (() => {
      let timer = null;
      return () => {
        clearTimeout(timer);
        timer = setTimeout(() => updateStatus("Saved."), 150);
      };
    })();

    apiKeyInput.addEventListener("input", () => {
      setApiKey(apiKeyInput.value.trim(), rememberKeyCheckbox.checked);
      saveDebounced();
    });

    rememberKeyCheckbox.addEventListener("change", () => {
      setApiKey(apiKeyInput.value.trim(), rememberKeyCheckbox.checked);
      saveDebounced();
    });

    modelSelect.addEventListener("change", () => {
      setModel(modelSelect.value);
      saveDebounced();
    });

    resetStorageBtn.addEventListener("click", () => {
      clearAll();
      apiKeyInput.value = "";
      rememberKeyCheckbox.checked = false;
      modelSelect.value = modelSelect.options[0]?.value || "";
      updateStatus("Cleared.");
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
