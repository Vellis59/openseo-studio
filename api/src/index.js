const ALLOWED_ORIGINS = new Set([
  "https://openseo.studio",
  "https://app.openseo.studio",
  "https://api.openseo.studio"
]);

const PROVIDERS = ["openrouter", "openai", "anthropic", "gemini", "ollama", "perplexity"];

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

/* ---------- tiny helpers (no deps, Cloudflare Worker compatible) ---------- */

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlEncodeJson(obj) {
  const jsonText = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(jsonText);
  return base64UrlEncodeBytes(bytes);
}

function hexToBytes(hex) {
  const cleaned = String(hex || "").trim().replace(/^0x/i, "");
  if (!cleaned || cleaned.length % 2 !== 0 || /[^0-9a-f]/i.test(cleaned)) return null;
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    out[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  }
  return out;
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

  if (provider === "perplexity") {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
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

      if (url.pathname === "/v1/publish/ghost" && request.method === "POST") {
        const payload = await request.json();
        const siteUrl = String(payload.siteUrl || payload.adminUrl || "")
          .trim()
          .replace(/\/+$/, "")
          .replace(/\/ghost$/i, "");
        const adminKey = String(payload.adminKey || "").trim();
        const title = String(payload.title || "Untitled").trim() || "Untitled";
        const html = String(payload.html || "");
        const tags = Array.isArray(payload.tags)
          ? payload.tags.map((t) => String(t).trim()).filter(Boolean)
          : [];
        const featureImage = String(payload.featureImage || "").trim();
        const publish = !!payload.publish;
        const metaTitle = String(payload.metaTitle || payload.meta_title || "").trim();
        const metaDescription = String(payload.metaDescription || payload.meta_description || "").trim();
        const excerpt = String(payload.excerpt || payload.custom_excerpt || "").trim();

        if (!siteUrl) throw new Error("Missing Ghost siteUrl.");
        if (!adminKey) throw new Error("Missing Ghost adminKey.");
        if (!html.trim()) throw new Error("Missing html.");

        const parts = adminKey.split(":");
        if (parts.length !== 2) throw new Error("Ghost adminKey must look like <id>:<secret>.");
        const [kid, secretHex] = parts;
        const secret = hexToBytes(secretHex);
        if (!secret) throw new Error("Ghost adminKey secret must be hex.");

        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + 5 * 60;
        const header = { alg: "HS256", typ: "JWT", kid };
        const jwtPayload = { iat, exp, aud: "/admin/" };
        const unsigned = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(jwtPayload)}`;

        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          secret,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );

        const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(unsigned));
        const token = `${unsigned}.${base64UrlEncodeBytes(new Uint8Array(sig))}`;

        const endpoint = `${siteUrl}/ghost/api/admin/posts/?source=html`;
        const post = {
          title,
          html,
          status: publish ? "published" : "draft",
          ...(featureImage ? { feature_image: featureImage } : {}),
          ...(metaTitle ? { meta_title: metaTitle } : {}),
          ...(metaDescription ? { meta_description: metaDescription } : {}),
          ...(excerpt ? { custom_excerpt: excerpt } : {}),
          ...(tags.length ? { tags: tags.map((name) => ({ name })) } : {})
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Ghost ${token}`
          },
          body: JSON.stringify({ posts: [post] })
        });

        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (!res.ok) {
          const msg = data?.errors?.[0]?.message || text || `Ghost request failed (HTTP ${res.status}).`;
          throw new Error(msg);
        }

        return withCors(request, json({ ok: true, post: data?.posts?.[0] || null }, { headers: corsHeaders(request) }));
      }

      if (url.pathname === "/v1/research/perplexity" && request.method === "POST") {
        const payload = await request.json();
        const query = String(payload.query || "").trim();
        const maxSources = Math.max(1, Math.min(12, Number(payload.maxSources) || 8));
        if (!query) throw new Error("Missing query.");

        const apiKey = bearerToken(request) || String(payload.apiKey || "").trim();
        if (!apiKey) throw new Error("Missing Perplexity API key (send Authorization: Bearer <key>)." );

        const body = {
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content:
                "You are a research assistant. Use web search. Return concise bullet points with up-to-date facts, and include a final 'Sources:' section with the URLs you used."
            },
            { role: "user", content: query }
          ],
          // Ask for a bit more context, but keep it readable
          max_tokens: 900,
          temperature: 0.2
        };

        const result = await callProvider({ provider: "perplexity", model: "sonar-pro", apiKey, body });
        const citations = Array.isArray(result?.raw?.citations) ? result.raw.citations.slice(0, maxSources) : [];

        const report = [
          result.text || "",
          citations.length ? `\n\nSources:\n${citations.map((u) => `- ${u}`).join("\n")}` : ""
        ]
          .join("")
          .trim();

        return withCors(request, json({ ok: true, report, citations }, { headers: corsHeaders(request) }));
      }

      if (url.pathname === "/v1/publish/wordpress" && request.method === "POST") {
        const payload = await request.json();
        const siteUrl = String(payload.siteUrl || "").trim().replace(/\/+$/, "");
        const username = String(payload.username || "").trim();
        const appPassword = String(payload.appPassword || payload.password || "").trim();
        const title = String(payload.title || "Untitled").trim() || "Untitled";
        const content = String(payload.html || payload.content || "");
        const excerpt = String(payload.excerpt || "").trim();

        if (!siteUrl) throw new Error("Missing WordPress siteUrl.");
        if (!username) throw new Error("Missing WordPress username.");
        if (!appPassword) throw new Error("Missing WordPress application password.");
        if (!content.trim()) throw new Error("Missing content.");

        const endpoint = `${siteUrl}/wp-json/wp/v2/posts`;
        const basic = btoa(`${username}:${appPassword}`);

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Basic ${basic}`
          },
          body: JSON.stringify({
            title,
            content,
            status: "draft",
            ...(excerpt ? { excerpt } : {})
          })
        });

        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (!res.ok) {
          const msg = data?.message || text || `WordPress request failed (HTTP ${res.status}).`;
          throw new Error(msg);
        }

        return withCors(request, json({ ok: true, post: data }, { headers: corsHeaders(request) }));
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
