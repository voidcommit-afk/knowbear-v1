# KnowBear (Stateless Demo)

KnowBear is a FastAPI + React app that generates layered explanations for a topic using LLMs.

This repository is currently configured as a **stateless, no-auth demo**:

- no database models, migrations, or user persistence
- no login/session/token flows
- no pro/subscription/role gating
- server-side rate limiting by IP (`5 requests/hour`) on query endpoints

## Features

- Layered explanations: `eli5`, `eli10`, `eli12`, `eli15`, `meme`, `classic60`, `gentle70`, `warm80`
- Two generation modes:
  - `fast`: single-model, lower latency
  - `ensemble`: multi-model synthesis with judge selection
- Streaming responses via SSE (`/api/query/stream`)
- Export generated content as `.txt` or `.md`
- Redis-backed response cache (best-effort; app still runs if Redis is unavailable)
- Clean no-auth frontend flow: app loads directly at `/`

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind, Framer Motion, Zustand
- Backend: FastAPI, Pydantic, Structlog
- LLM routing: Groq + Gemini fallback paths
- Cache: Redis

## Repository Structure

```text
.
├── main.py                  # Root ASGI shim (supports `uvicorn main:app`)
├── api/
│   ├── main.py              # FastAPI app setup and router wiring
│   ├── rate_limit.py        # In-memory IP limiter (5/hour)
│   ├── routers/
│   │   ├── pinned.py        # GET /api/pinned
│   │   ├── query.py         # POST /api/query, POST /api/query/stream
│   │   └── export.py        # POST /api/export
│   ├── services/            # inference/model/cache/search services
│   ├── config.py            # environment settings
│   └── tests/               # backend tests
├── src/
│   ├── api.ts               # frontend API client
│   ├── pages/AppPage.tsx    # primary UI page
│   ├── components/          # UI components
│   ├── store/               # Zustand app state
│   └── types.ts             # shared frontend types
├── public/
├── package.json
└── .env.example
```

## API Endpoints

- `GET /api/pinned`
  - Returns curated pinned topics.
- `POST /api/query`
  - Generates one or more explanation levels.
- `POST /api/query/stream`
  - Streams explanation chunks (SSE).
- `POST /api/export`
  - Returns exported explanation file (`txt` or `md`).
- `GET /api/health`
  - Health + dependency status.

## Rate Limiting

Rate limiting is enforced server-side on query routes by client IP:

- limit: **5 requests per hour per IP**
- exceeded response: **HTTP 429** with retry metadata in `detail`

IP resolution order:

1. `x-forwarded-for` (first IP)
2. `request.client.host`

## Local Setup

### 1) Install frontend dependencies

```bash
npm install
```

### 2) Install backend dependencies

Use your preferred environment manager, then install:

```bash
pip install -r api/requirements.txt
```

### 3) Configure environment

Copy `.env.example` to `.env` and set values as needed.

Minimum useful keys:

- `GROQ_API_KEY`
- `GEMINI_API_KEY` (optional fallback path)
- `REDIS_URL` (optional but recommended for caching)
- `VITE_API_URL`

## Running the App

### Backend (from repo root)

```bash
python3 -m uvicorn main:app --reload
```

Alternative:

```bash
python3 -m uvicorn api.main:app --reload
```

### Frontend

```bash
npm run dev
```

## Validation Commands

```bash
npm run type-check
npm run build
npm test -- --run
```

Backend quick sanity checks:

```bash
python3 -m compileall -q api
python3 -c "import main; print(bool(main.app))"
```

## Notes

- This demo is intentionally stateless and unauthenticated.
- In-memory rate limiter state resets on process restart.
- For multi-instance production deployments, move rate limiting to a shared store.
