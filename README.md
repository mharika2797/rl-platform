# RL Training Data Platform

A web platform for creating RL training tasks, collecting human feedback, and monitoring training quality for AI agents.

## Stack

- **Backend**: FastAPI + Python 3.12, SQLAlchemy 2.0 (async), Alembic
- **Workers**: Celery + Redis
- **Database**: PostgreSQL 16
- **Observability**: Prometheus + Grafana
- **Infra**: Docker Compose → AWS ECS / GCP Cloud Run

---

## Quick Start

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env — set SECRET_KEY to a long random string
```

### 2. Start all services

```bash
docker compose up --build
```

This starts: PostgreSQL, Redis, FastAPI (port 8000), Celery worker, Prometheus (9090), Grafana (3001).

### 3. Verify

```bash
curl http://localhost:8000/health
# {"status":"ok","environment":"development"}
```

- **API docs**: http://localhost:8000/docs
- **Grafana**: http://localhost:3001 (admin / admin)
- **Prometheus**: http://localhost:9090

---

## Development

### Running locally (without Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start Postgres + Redis via Docker only
docker compose up db redis -d

# Run API
uvicorn app.main:app --reload --port 8000

# Run worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info
```

### Database migrations (Alembic)

```bash
cd backend

# Create a migration after changing models
alembic revision --autogenerate -m "describe your change"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## Project Structure

```
rl-platform/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py          # Auth dependencies
│   │   │   └── v1/
│   │   │       ├── router.py
│   │   │       └── endpoints/
│   │   │           └── auth.py
│   │   ├── core/
│   │   │   ├── config.py        # Settings (pydantic-settings)
│   │   │   └── security.py      # JWT + password hashing
│   │   ├── db/
│   │   │   └── session.py       # Async SQLAlchemy engine
│   │   ├── models/
│   │   │   └── models.py        # All ORM models
│   │   ├── schemas/
│   │   │   └── auth.py          # Pydantic request/response schemas
│   │   ├── workers/
│   │   │   ├── celery_app.py    # Celery config
│   │   │   └── tasks.py         # Task stubs (implemented in Phase 4)
│   │   └── main.py              # FastAPI app entrypoint
│   ├── alembic/                 # Migration scripts
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                    # Phase 3: React + TypeScript
├── infra/
│   ├── prometheus.yml
│   └── grafana/
├── docker-compose.yml
└── .env.example
```

---

## API Endpoints (Phase 1)

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /metrics | Prometheus metrics |
| POST | /api/v1/auth/register | Create account |
| POST | /api/v1/auth/login | Get JWT token |
| GET | /api/v1/auth/me | Current user info |

More endpoints added in Phase 2 (tasks, feedback, assignments).

---

## Build Phases

- ✅ **Phase 1** — Infrastructure, DB schema, Auth, Docker Compose
- 🔲 **Phase 2** — Task CRUD, Feedback API, Assignment queue
- 🔲 **Phase 3** — React + TypeScript frontend
- 🔲 **Phase 4** — Quality scoring, Export pipeline, Grafana dashboards
- 🔲 **Phase 5** — Cloud deployment, CI/CD
