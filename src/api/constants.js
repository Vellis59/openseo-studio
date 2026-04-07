export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export const CHAT_PROVIDERS = {
  openrouter: "openrouter",
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  ollama: "ollama"
};

export const CURATED_MODELS = {
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
  ollama: []
};

export const MODEL_PRICING = {
  default: { prompt: 0.003, completion: 0.006 }
};

export const LANGUAGES = {
  en: { label: "English", promptName: "English", seoNotes: "Use natural phrasing suited to search intent and readability." },
  fr: { label: "French", promptName: "French", seoNotes: "Respect French typographic rules and natural SEO wording." },
  es: { label: "Spanish", promptName: "Spanish" },
  de: { label: "German", promptName: "German" },
  it: { label: "Italian", promptName: "Italian" },
  "pt-pt": { label: "Portuguese (Portugal)", promptName: "European Portuguese", seoNotes: "Use vocabulary and spelling for Portugal." },
  "pt-br": { label: "Portuguese (Brazil)", promptName: "Brazilian Portuguese", seoNotes: "Use vocabulary and spelling for Brazil." },
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
  "zh-hans": { label: "Simplified Chinese", promptName: "Simplified Chinese", seoNotes: "Use Simplified Chinese characters and natural SEO phrasing." },
  "zh-hant": { label: "Traditional Chinese", promptName: "Traditional Chinese", seoNotes: "Use Traditional Chinese characters and natural SEO phrasing." },
  ar: { label: "Arabic", promptName: "Arabic" }
};

export const NON_LATIN_LANGUAGE_CODES = new Set(["ja", "ko", "zh-hans", "zh-hant", "ar"]);
export const DEFAULT_LANGUAGE = "en";

export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";
