const ALLOWED_ORIGINS = new Set([
  "https://openseo.studio",
  "https://api.openseo.studio"
]);

const PROVIDERS = ["openrouter", "openai", "anthropic", "gemini", "ollama"];

const CURATED_MODELS = {
  openai: [
    { id: "gpt-4o-mini", label: "gpt-4o-mini" },
    { id: "gpt-4o", label: "gpt-4o" }
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-latest", label: "claude-3.5 Sonnet" },
    { id: "claude-3-5-haiku-latest", label: "claude-3.5 Haiku" }
  ],
  gemini: [
    { id: "gemini-1.5-flash", label: "gemini-1.5-flash" },
    { id: "gemini-1.5-pro", label: "gemini-1.5-pro" }
  ],
  ollama: [
    { id: "llama3.1", label: "llama3.1" },
    { id: "qwen2.5", label: "qwen2.5" }
  ]
};

function json(data, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";

  return {
    ...(allowOrigin ? { "access-control-allow-origin": allowOrigin } : {}),
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function withCors(request, response) {
  const headers = new Headers(response.headers);
  const extras = corsHeaders(request);
  Object.entries(extras).forEach(([k, v]) => {
    if (v) headers.set(k, v);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function normalizeProvider(value) {
  const p = String(value || "").toLowerCase().trim();
  if (!p) return "openrouter";
  if (!PROVIDERS.includes(p)) throw new Error(`Unsupported provider: ${p}`);
  return p;
}

function bearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function safeReadText(res, max = 2000) {
  const text = await res.text();
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

async function toError(res) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await res.json();
      const msg = data?.error?.message || data?.message || JSON.stringify(data);
      return msg;
    } catch {
      // fallthrough
    }
  }
  return await safeReadText(res);
}

function buildMessages({ system, prompt }) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  return messages;
}

function taskToSystemAndPrompt(task, input) {
  const safeTask = String(task || "").trim();
  const data = input && typeof input === "object" ? input : {};

  // Keep it generic: API is transport; prompt design stays in the client.
  // We accept raw `messages` too, but for MVP we support {task,input}.
  const system = data.system || "You are a helpful writing assistant.";
  const prompt = data.prompt || data.text || data.instructions || "";

  if (!prompt) {
    throw new Error(`Missing prompt for task: ${safeTask || "(none)"}`);
  }

  return { system, prompt };
}

async function callProvider({ provider, model, apiKey, baseUrl, body }) {
  if (provider === "openrouter") {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(await toError(res));
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return { text, raw: data };
  }

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(await toError(res));
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return { text, raw: data };
  }

  if (provider === "anthropic") {
    const anthropicBody = {
      model,
      max_tokens: body?.max_tokens ?? 1200,
      system: body?.messages?.find((m) => m.role === "system")?.content || "",
      messages: (body?.messages || [])
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: [{ type: "text", text: String(m.content || "") }]
        }))
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(anthropicBody)
    });

    if (!res.ok) throw new Error(await toError(res));
    const data = await res.json();
    const text = data?.content?.map((c) => c.text).join("") || "";
    return { text, raw: data };
  }

  if (provider === "gemini") {
    const systemInstruction = body?.messages?.find((m) => m.role === "system")?.content || "";
    const contents = (body?.messages || [])
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content || "") }]
      }));

    const geminiBody = {
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
      contents,
      generationConfig: {
        temperature: body?.temperature,
        topP: body?.top_p,
        maxOutputTokens: body?.max_tokens
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(geminiBody)
    });

    if (!res.ok) throw new Error(await toError(res));
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    return { text, raw: data };
  }

  if (provider === "ollama") {
    const url = `${String(baseUrl || "http://localhost:11434").replace(/\/$/, "")}/api/chat`;
    const ollamaBody = {
      model,
      messages: body?.messages || [],
      stream: false,
      options: {
        temperature: body?.temperature,
        top_p: body?.top_p,
        num_predict: body?.max_tokens
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ollamaBody)
    });

    if (!res.ok) throw new Error(await toError(res));
    const data = await res.json();
    const text = data?.message?.content || "";
    return { text, raw: data };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(request, new Response(null, { status: 204, headers: corsHeaders(request) }));
    }

    try {
      if (url.pathname === "/health") {
        return withCors(request, json({ ok: true, name: "openseo-api" }, { headers: corsHeaders(request) }));
      }

      if (url.pathname === "/v1/providers" && request.method === "GET") {
        return withCors(request, json({ providers: PROVIDERS }, { headers: corsHeaders(request) }));
      }

      if (url.pathname === "/v1/models" && request.method === "GET") {
        const provider = normalizeProvider(url.searchParams.get("provider"));

        if (provider === "openrouter") {
          const apiKey = bearerToken(request);
          if (!apiKey) {
            return withCors(request, json({ models: [], note: "Provide Authorization: Bearer <key> to list OpenRouter models." }, { headers: corsHeaders(request) }));
          }

          const res = await fetch("https://openrouter.ai/api/v1/models", {
            headers: { "authorization": `Bearer ${apiKey}` }
          });
          if (!res.ok) throw new Error(await toError(res));
          const data = await res.json();
          const models = (data?.data || []).map((m) => ({ id: m.id, label: m.name || m.id }));
          return withCors(request, json({ models }, { headers: corsHeaders(request) }));
        }

        return withCors(request, json({ models: CURATED_MODELS[provider] || [] }, { headers: corsHeaders(request) }));
      }

      if (url.pathname === "/v1/generate" && request.method === "POST") {
        const payload = await request.json();
        const provider = normalizeProvider(payload.provider);
        const model = String(payload.model || "").trim();
        const baseUrl = payload.baseUrl;

        if (!model) throw new Error("Missing model");

        const apiKey = provider === "ollama" ? "" : (payload.apiKey || bearerToken(request));
        if (provider !== "ollama" && !apiKey) throw new Error("Missing API key (use Authorization: Bearer <key> or apiKey in body)");

        const { system, prompt } = taskToSystemAndPrompt(payload.task, payload.input);
        const messages = payload.messages || buildMessages({ system, prompt });

        const body = {
          model,
          messages,
          temperature: payload.options?.temperature,
          top_p: payload.options?.top_p,
          max_tokens: payload.options?.max_tokens ?? 1200
        };

        const result = await callProvider({ provider, model, apiKey, baseUrl, body });
        return withCors(request, json({
          provider,
          model,
          text: result.text
        }, { headers: corsHeaders(request) }));
      }

      if (url.pathname === "/v1/export" && request.method === "POST") {
        const payload = await request.json();
        // Transport-only: just echo back a normalized export envelope.
        return withCors(request, json({
          version: payload.version || null,
          exportedAt: new Date().toISOString(),
          data: payload.data || payload
        }, { headers: corsHeaders(request) }));
      }

      return withCors(request, json({ error: "Not found" }, { status: 404, headers: corsHeaders(request) }));
    } catch (err) {
      return withCors(request, json({ error: err?.message || String(err) }, { status: 400, headers: corsHeaders(request) }));
    }
  }
};
