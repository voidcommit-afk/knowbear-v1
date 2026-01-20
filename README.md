# KnowBear Knowledge Engine

AI-powered layered explanations for any topic. Built with FastAPI (Python) and React (TypeScript).

## Features

- **Layered Explanations**: ELI5 to ELI15, meme-style, technical deep dives
- **Multi-Model Ensemble**: Parallel generation with judge-based voting
- **Redis Caching**: 24-hour TTL for fast repeat queries
- **Export Options**: Download as .txt, .json, or .pdf
- **Dark Theme UI**: Minimalist design with color-coded complexity levels

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Redis (optional, for caching)

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
GROQ_API_KEY=your_groq_api_key
REDIS_URL=redis://localhost:6379
VITE_API_URL=http://localhost:8000
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Testing

### Backend Tests

```bash
cd backend
pip install pytest pytest-asyncio
pytest -v
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Linting

```bash
# Backend
cd backend
pip install black pylint
black --check .
pylint app/

# Frontend
cd frontend
npm run lint
npm run format:check
```

## Build

```bash
cd frontend
npm run build
```

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pinned` | GET | Curated popular topics |
| `/api/query` | POST | Generate explanations |
| `/api/export` | POST | Export as file |
| `/health` | GET | Health check |

## Architecture

```
KnowBear/
├── backend/           # FastAPI server
│   ├── app/
│   │   ├── main.py    # App entry
│   │   ├── routers/   # API endpoints
│   │   └── services/  # Business logic
│   └── tests/         # pytest tests
├── frontend/          # React app
│   ├── src/
│   │   ├── components/
│   │   └── tests/     # Vitest tests
└── vercel.json        # Deployment config
```

## License

MIT
