import { CHAT_PROVIDERS, OPENROUTER_URL, OPENROUTER_MODELS_URL, OLLAMA_DEFAULT_BASE_URL } from './constants.js';
import { sanitizeApiKey } from '../utils/text.js';

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

export function coerceOpenAiMessages(inputMessages = [], includeSystem = true) {
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

export async function callChatProvider({ provider, model, apiKey, baseUrl, body, messages, params } = {}) {
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

  if (provider === CHAT_PROVIDERS.openrouter) {
    const sanitizedKey = sanitizeApiKey(apiKey);
    if (!sanitizedKey) throw new Error("Invalid API key.");
    url = OPENROUTER_URL;
    headers.Authorization = `Bearer ${sanitizedKey}`;
    requestBody = { ...body, model: resolvedModel, messages: coerceOpenAiMessages(resolvedMessages) };
  } else if (provider === CHAT_PROVIDERS.openai) {
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
  } else if (provider === CHAT_PROVIDERS.anthropic) {
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
      max_tokens: Number.isFinite(Number(common.max_tokens)) ? Number(common.max_tokens) : 1024,
      temperature: common.temperature
    };
  } else if (provider === CHAT_PROVIDERS.gemini) {
    const sanitizedKey = sanitizeApiKey(apiKey);
    if (!sanitizedKey) throw new Error("Invalid API key.");
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent?key=${encodeURIComponent(sanitizedKey)}`;
    requestBody = toGeminiRequest(resolvedMessages);
    requestBody.generationConfig = {
      temperature: common.temperature,
      topP: common.top_p,
      maxOutputTokens: common.max_tokens
    };
  } else if (provider === CHAT_PROVIDERS.ollama) {
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
    throw new Error(`Unsupported provider: ${provider}`);
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
      message = parsed?.error?.message || parsed?.message || parsed?.error || message;
    } catch {
      if (text && text.trim()) message = text.slice(0, 400);
    }
    throw new Error(message);
  }

  const data = await response.json();

  const content = (() => {
    if (provider === CHAT_PROVIDERS.anthropic) return extractTextFromAnthropicResponse(data);
    if (provider === CHAT_PROVIDERS.gemini) return extractTextFromGeminiResponse(data);
    if (provider === CHAT_PROVIDERS.ollama) return extractTextFromOllamaResponse(data);
    return extractTextFromOpenAiLikeResponse(data);
  })();

  if (!content) {
    throw new Error("Empty or unexpected API response.");
  }

  return content;
}

export async function fetchModels(provider, apiKey, baseUrl) {
  if (provider === CHAT_PROVIDERS.openrouter) {
    const sanitizedKey = sanitizeApiKey(apiKey);
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: { Authorization: `Bearer ${sanitizedKey}` }
    });
    if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
    const payload = await response.json();
    return (payload?.data || []).map((m) => ({ id: m.id, name: m.name || m.id }));
  }

  if (provider === CHAT_PROVIDERS.ollama) {
    const base = (baseUrl || "").trim().replace(/\/+$/, "");
    const response = await fetch(`${base}/api/tags`);
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
    const payload = await response.json();
    return (payload?.models || []).map((m) => ({ id: m.name, name: m.name }));
  }

  return [];
}
