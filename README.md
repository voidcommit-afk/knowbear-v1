# KnowBear Knowledge Engine

AI-powered layered explanations for any topic. Built with FastAPI (Python) and React (TypeScript).

## Features

- **Layered Explanations**: ELI5 to ELI15, meme-style, technical deep dives
- **Intelligent Routing**: Optimized model selection (DeepSeek-R1 for logic, Qwen for code, Gemini for visual/context)
- **Multi-Model Ensemble**: Parallel generation with judge-based voting
- **Redis Caching**: Smart caching for fast repeat queries
- **Export Options**: Download as .txt, .json, or .pdf
- **Dark Theme UI**: Minimalist, space-themed design

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
- **AI/LLM**: Groq (Llama, DeepSeek, Qwen), Google Gemini
- **Database/Cache**: Redis (Upstash/Cloud), Supabase (Auth)
