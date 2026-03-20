# KnowBear Knowledge Engine

AI-powered layered explanations for any topic. Built with FastAPI (Python) and React (TypeScript).

## Status

This repository is the deprecated **KnowBear v1** codebase, kept for historical reference.

- Active repository (v2): https://github.com/voidcommit-afk/know-bear
- This repo (v1): legacy snapshot, no active feature development

## Features

- **Layered Explanations**: ELI5 to ELI15, meme-style, technical deep dives
- **Mode-Based Routing**: `fast` uses a single low-latency model, `ensemble` runs multi-model generation with judge-based selection
- **Multi-Model Ensemble**: Parallel generation with judge-based voting
- **Redis Caching**: Smart caching for fast repeat queries
- **Export Options**: Download as .txt, .json, or .pdf
- **Dark Theme UI**: Minimalist, space-themed design

## Model Routing (Actual v1)

### Query Modes (`/api/query`)

- `fast` mode:
	- Uses one Groq model: `llama-3.1-8b-instant`
	- Lower latency path (no judge)

- `ensemble` mode:
	- Runs these Groq models in parallel:
		- `llama-3.1-8b-instant`
		- `llama-3.3-70b-versatile`
		- `llama-3.1-70b-versatile`
		- `deepseek-r1-distill-llama-70b`
		- `mixtral-8x7b-32768`
	- Uses `llama-3.3-70b-versatile` as a judge to select the best response
	- Server enforces premium gating for `ensemble`

### Fallback Behavior

- If Groq fails, the backend fallback chain is:
	1. Hugging Face Inference API (`microsoft/Phi-3-mini-4k-instruct`) when `HF_TOKEN` is configured
	2. Google Gemini (`gemini-2.0-flash`) when `GEMINI_API_KEY` is configured

### Streaming Notes (`/api/query/stream`)

- Streaming path uses `llama-3.1-8b-instant` in current implementation.
- Response chunks are adaptively buffered/flushed for smoother UX, with truncation signaling when token limits are hit.

## Architecture

```
KnowBear/
├── api/               # FastAPI backend (Serverless compatible)
│   ├── main.py        # App entry point
│   ├── routers/       # API endpoints
│   └── services/      # Business logic (Routing, Inference, Cache)
├── src/               # React frontend
│   ├── components/    # Reusable UI components
│   ├── pages/         # Page layouts
│   └── hooks/         # Custom React hooks
├── public/            # Static assets
└── vercel.json        # Deployment configuration
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pinned` | GET | Curated popular topics |
| `/api/query` | POST | Generate layered explanations |
| `/api/export` | POST | Export results as file |
| `/api/health` | GET | System health check (Redis/Dependencies) |

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Framer Motion
- **Backend**: FastAPI, Pydantic, Structlog
- **AI/LLM**: Groq (Llama, DeepSeek, Mixtral), Google Gemini, Hugging Face Inference API
- **Database/Cache**: Redis (Upstash/Cloud), Supabase (Auth)
