# OpenSEO Studio API (optional)

This folder contains an **optional** HTTP API gateway for OpenSEO Studio.

- **BYOK pass-through** (no server-side key storage)
- Deployable to **Cloudflare Workers**
- Can also run **locally** or on a **VPS**

## Endpoints (MVP)

- `GET /health`
- `GET /v1/providers`
- `GET /v1/models?provider=...`
- `POST /v1/generate`
- `POST /v1/export`

## CORS

Configured to allow:
- `https://openseo.studio`
- `https://api.openseo.studio`

Adjust in `src/index.js` if needed.
