# KnowBear

KnowBear is a search-driven AI app that explains any topic in multiple readability levels. It supports two runtime modes:

- `fast` for low-latency responses
- `ensemble` for higher-quality synthesis

Both modes use the same retrieval entry point and enrich prompts with live web context before generation.

## Features

- Search-driven explanation workflow
- `fast` mode: quick response path
- `ensemble` mode: multi-model generation with judge selection
- Streaming responses over SSE
- Export as `.txt` or `.md`

## Architecture (High Level)

- Frontend: React + Vite UI for search, mode selection, streaming, and export
- Backend: FastAPI API for query, stream, export, and health endpoints
- LLM routing layer: provider abstraction for model routing/judging
- LiteLLM proxy: optional external gateway integration point (not bundled in this repo)
- Search API integration: Exa, Tavily, and Serper for retrieval context

## API Endpoints

- `GET /api/pinned` -> curated starter topics
- `POST /api/query` -> generate one or more levels
- `POST /api/query/stream` -> stream generated text
- `POST /api/export` -> export as `txt` or `md`
- `GET /api/health` -> service status

## Setup

### 1) Install dependencies

```bash
npm install
pip install -r api/requirements.txt
```

### 2) Configure environment

Copy `.env.example` to `.env` and set required keys.

Required:

- `GROQ_API_KEY`
- `VITE_API_URL`

Recommended:

- `GEMINI_API_KEY` (judge/fallback path)
- `TAVILY_API_KEY`
- `SERPER_API_KEY`
- `EXA_API_KEY`

### 3) Run the app

Backend:

```bash
python3 -m uvicorn main:app --reload
```

Frontend:

```bash
npm run dev
```

## Usage

1. Open the app at `http://localhost:5173/app` (or your configured frontend URL).
2. Enter a topic.
3. Choose mode:
   - `fast` for speed
   - `ensemble` for stronger quality
4. Read the streamed response and export if needed.

## Validation

```bash
npm run type-check
npm test -- --run
python3 -m compileall -q api
python3 -c "import main; print(bool(main.app))"
```

---

## Development Journey

KnowBear started as a simple web app with single query-response interactions—the same lean stateless model you see today. It later evolved into a sophisticated chat application with three distinct workspace modes, designed to support complex multi-turn conversations and collaborative workspaces. After exploration, that architecture was sunsetted in favor of a more focused vision: a depth-first, explanation-driven B2B API powered by RAG (Retrieval-Augmented Generation).

This current incarnation represents that refined direction—a streamlined, production-ready API that prioritizes depth of explanation and relevance through live retrieval context, while maintaining the simplicity and low-latency characteristics that made the original concept compelling.
