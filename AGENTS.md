# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Miya is a gamified spaced repetition learning app with an AI assistant ("Moto") for flashcard generation. The primary language of the UI and content is Russian. The backend is Python/FastAPI, the frontend is React/TypeScript/Vite.

## Build & Run Commands

### Quick start (Windows)

```
miya.bat
```

This opens backend + frontend + browser in separate windows.

### Backend

```powershell
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm ci
npm run dev
```

### Docker

```
docker compose up --build
```

### Database Migrations

```powershell
cd backend
alembic upgrade head                              # apply all
alembic revision --autogenerate -m "description"  # create new
alembic downgrade -1                              # rollback one
```

Seed data:

```powershell
python -m app.db.seed_shop
python -m app.db.seed_achievements
```

### Tests

```powershell
cd backend
pytest tests/ -v --tb=short
```

Run a single test:

```powershell
pytest tests/test_example.py::test_example -v
```

### Linting

```powershell
cd backend
ruff check app
ruff format app --check
```

Auto-fix:

```powershell
ruff check app --fix
ruff format app
```

Frontend lint (if ESLint is configured):

```powershell
cd frontend
npx eslint src --ext .ts,.tsx --max-warnings 0
```

### Makefile (Linux/macOS or WSL)

`make install`, `make dev`, `make build`, `make test`, `make lint`, `make lint-fix`, `make up`, `make down`, `make clean`.

## Architecture

### Backend (FastAPI) — `backend/app/`

Layered architecture with clear separation:

- **`api/routes/`** — Route handlers (thin controllers). Each module maps to an API domain: `auth`, `decks`, `cards`, `study`, `ai`, `shop`, `achievements`, `import_export`, `mental_map`, `users`.
- **`api/router.py`** — Aggregates all route modules under `/api` prefix.
- **`core/`** — App-wide configuration and infrastructure:
  - `config.py` — `pydantic-settings` based `Settings` class, reads from `backend/.env`. All env vars are defined here.
  - `security.py` — JWT token creation (access + refresh) via `python-jose`, bcrypt password hashing.
  - `deps.py` — FastAPI dependency injection: `get_current_user` (JWT → User), `get_db` (session).
  - `logging_config.py` — JSON logging in production, human-readable in dev.
- **`crud/`** — Database access layer (SQLAlchemy queries). One file per entity.
- **`models/`** — SQLAlchemy ORM models. Key models: `User`, `Deck`, `Card`, `CardLink`, `CardPosition`, `MentalMap`, `MentalMapNode`, `ShopItem`, `UserInventory`, `Achievement`, `UserAchievement`.
- **`schemas/`** — Pydantic request/response schemas.
- **`services/`** — Business logic:
  - `sm2.py` — SuperMemo SM-2 spaced repetition algorithm. Quality 0–5, ease factor adjustments, interval calculation.
  - `economy.py` — XP/coin/streak calculation based on review quality and difficulty.
  - `ai_agent.py` — Uses Groq API (OpenAI-compatible client, currently `moonshotai/kimi-k2-instruct` model) to generate flashcard decks from text. Prompts are in Russian.
  - `boosts.py` — XP/coin boost system from shop items.
- **`db/`** — Session factory (`SessionLocal`), `Base` declarative base, seed scripts.

**Database:** SQLite in development (`backend/app.db`), PostgreSQL-ready. Migrations via Alembic (`backend/alembic/`). All models must be imported in `alembic/env.py` for autogenerate to work.

**Entry point:** `backend/app/main.py` — creates FastAPI app, attaches CORS, rate limiting (SlowAPI), lifespan handler, health endpoints (`/health`, `/ready`).

### Frontend (React 18 + TypeScript) — `frontend/src/`

- **`pages/`** — Top-level route components. `App.tsx` is the root with React Router v6 route definitions and the nav bar.
- **`components/`** — Reusable UI organized by domain: `auth/`, `cards/`, `decks/`, `study/`, `ui/`. The `ui/` folder has generic components (Button, Badge, Modal, RichTextEditor via TipTap, ToastProvider).
- **`contexts/AuthContext.tsx`** — Auth state (user, login, register, logout, refreshMe). Wraps the app.
- **`services/`** — API client modules. `api.ts` is the axios instance with token interceptor, automatic refresh on 401, and retry logic. Domain-specific files (`deck.ts`, `card.ts`, `study.ts`, `ai.ts`, `shop.ts`, `achievements.ts`, `auth.ts`) wrap endpoints.
- **`hooks/`** — Custom hooks (e.g., `useApi.ts`).
- **`utils/`** — `storage.ts` (localStorage token management), `validation.ts`, `html.ts`.
- **`styles/`** — `theme.css` for CSS custom properties. Components use inline styles extensively.

**API base URL:** Configured via `VITE_API_BASE_URL` env var (defaults to `http://localhost:8000`).

**Routes:** `/login`, `/register`, `/decks`, `/decks/:deckId`, `/study/:deckId?`, `/shop`, `/inventory`, `/achievements`, `/ai-agent`, `/battlefield`, `/battlefield/:mapId`, `/import-export`, `/focus`, `/profile`. All except auth pages are wrapped in `ProtectedRoute`.

### Key Patterns

- **Auth flow:** JWT access + refresh tokens stored in localStorage. The axios interceptor auto-refreshes on 401 and queues concurrent requests during refresh.
- **Dependency injection:** FastAPI `Depends()` chains: `get_db` for sessions, `get_current_user` for auth.
- **Config:** All backend config is in `Settings` class via env vars. Copy `backend/.env.example` to `backend/.env`.
- **AI integration:** Uses OpenAI-compatible SDK pointed at Groq's base URL. Requires `GROQ_API_KEY` in `.env`.

## Environment Variables

Backend (`backend/.env`):

- `DATABASE_URL` — SQLite default: `sqlite:///./app.db`
- `SECRET_KEY` — JWT signing key (must change in prod)
- `GROQ_API_KEY` — Required for AI features
- `BACKEND_CORS_ORIGINS` — Comma-separated allowed origins
- `ENVIRONMENT` — `development` | `staging` | `production`
- `RATE_LIMIT_PER_MINUTE` — Default 60

Frontend: `VITE_API_BASE_URL` (build-time, defaults to `http://localhost:8000`).

## Conventions

- **Commit messages:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- **Backend:** PEP 8, type hints throughout. Ruff for linting and formatting.
- **Frontend:** TypeScript strict mode. No ESLint config currently bundled — lint command uses npx fallback.
- **Branching:** `main` (production), `staging`, `develop`. CI triggers on push/PR to all three.

## CI/CD

GitHub Actions (`.github/workflows/ci-cd.yml`):

1. **backend-lint-test** — Python 3.12, ruff, pytest
2. **frontend-lint-build** — Node 20, eslint (optional), `npm run build` (includes tsc)
3. **docker-build** — Builds and pushes images to `ghcr.io` on push
4. **scan** — Trivy vulnerability scan on main/staging
5. **deploy-staging / deploy-production** — Placeholder steps
