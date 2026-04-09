// Storage keys
export const STORAGE_KEY_API = "openseo_openrouter_key";
export const STORAGE_KEY_MODEL = "openseo_default_model";
export const STORAGE_KEY_PROVIDER = "openseo_provider";
export const STORAGE_KEY_PROVIDER_CONFIGS = "openseo_provider_configs";
export const STORAGE_KEY_API_GENERIC = "openseo_api_key";
export const STORAGE_KEY_BASE_URL = "openseo_base_url";
export const STORAGE_KEY_USE_API_GATEWAY = "openseo_use_api_gateway";
export const STORAGE_KEY_API_GATEWAY_BASE_URL = "openseo_api_gateway_base_url";
export const STORAGE_KEY_USE_WEB_RESEARCH = "openseo_use_web_research";
export const STORAGE_KEY_WEB_RESEARCH_CACHE = "openseo_web_research_cache";
export const STORAGE_KEY_PERPLEXITY_API_KEY = "openseo_perplexity_api_key";
export const STORAGE_KEY_THEME = "openseo_color_theme";
export const STORAGE_KEY_HISTORY = "openseo_article_history";
export const STORAGE_KEY_SPEND = "openseo_monthly_spend";
export const STORAGE_KEY_GENERATION_OPTIONS = "openseo_generation_options";
export const STORAGE_KEY_WELCOME = "openseo_welcome_dismissed";
export const STORAGE_KEY_GHOST_ADMIN_URL = "openseo_ghost_admin_url";
export const STORAGE_KEY_GHOST_ADMIN_KEY = "openseo_ghost_admin_key";
export const STORAGE_KEY_GHOST_REMEMBER = "openseo_ghost_remember";
export const STORAGE_KEY_WP_CONFIG = "openseo_wordpress_config";

export const MAX_HISTORY_ITEMS = 20;

let isAnonymous = false;

export function setAnonymous(value) {
  isAnonymous = value;
}

export function getIsAnonymous() {
  return isAnonymous;
}

export function setItemGuarded(key, value) {
  if (isAnonymous) return;
  window.localStorage.setItem(key, value);
}

export function getItem(key) {
  return window.localStorage.getItem(key);
}

export function readBoolStorage(key, fallback = false) {
  if (isAnonymous) return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null || raw === undefined) return fallback;
  return raw === "1" || raw === "true";
}

export function writeBoolStorage(key, value) {
  setItemGuarded(key, value ? "1" : "0");
}

export function removeItem(key) {
  window.localStorage.removeItem(key);
}

export function base64Encode(text) {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch (err) {
    console.error("base64Encode error", err);
    return "";
  }
}

export function base64Decode(text) {
  try {
    return decodeURIComponent(escape(atob(text)));
  } catch (err) {
    console.error("base64Decode error", err);
    return "";
  }
}

export function xorEncrypt(text, password) {
  if (!password) return base64Encode(text);
  const cipher = text
    .split("")
    .map((char, idx) => String.fromCharCode(char.charCodeAt(0) ^ password.charCodeAt(idx % password.length)))
    .join("");
  return base64Encode(cipher);
}

export function xorDecrypt(cipher, password) {
  if (!password) return base64Decode(cipher);
  const decoded = base64Decode(cipher);
  return decoded
    .split("")
    .map((char, idx) => String.fromCharCode(char.charCodeAt(0) ^ password.charCodeAt(idx % password.length)))
    .join("");
}

export function loadHistoryFromStorage() {
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

export function persistHistory(history) {
  if (isAnonymous) return;
  setItemGuarded(STORAGE_KEY_HISTORY, JSON.stringify(history));
}

export function addHistoryEntry(entry) {
  if (isAnonymous) return [];
  const history = loadHistoryFromStorage();
  const item = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    ...(entry || {}),
  };
  const next = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
  persistHistory(next);
  return next;
}

export function loadMonthlySpend() {
  if (isAnonymous) return 0;
  const raw = window.localStorage.getItem(STORAGE_KEY_SPEND);
  return raw ? parseFloat(raw) || 0 : 0;
}

export function persistMonthlySpend(value) {
  if (isAnonymous) return;
  setItemGuarded(STORAGE_KEY_SPEND, String(value.toFixed(2)));
}

export function loadGenerationOptions(defaults) {
  if (isAnonymous) return { ...defaults };
  const raw = window.localStorage.getItem(STORAGE_KEY_GENERATION_OPTIONS);
  if (!raw) return { ...defaults };
  try {
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch (err) {
    console.warn("Unable to parse generation options:", err);
    return { ...defaults };
  }
}

export function persistGenerationOptions(options) {
  if (isAnonymous) return;
  setItemGuarded(STORAGE_KEY_GENERATION_OPTIONS, JSON.stringify(options));
}

export function loadProviderConfigs() {
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

export function persistProviderConfigs(configs) {
  if (isAnonymous) return;
  setItemGuarded(STORAGE_KEY_PROVIDER_CONFIGS, JSON.stringify(configs || {}));
}

export function getProviderConfig(provider) {
  const configs = loadProviderConfigs();
  const value = configs[provider];
  return value && typeof value === "object" ? value : {};
}

export function setProviderConfig(provider, partial) {
  const configs = loadProviderConfigs();
  const current = configs[provider] && typeof configs[provider] === "object" ? configs[provider] : {};
  configs[provider] = { ...current, ...(partial || {}) };
  persistProviderConfigs(configs);
}
