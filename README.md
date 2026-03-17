# RLFlow

**End-to-End RLHF Data Collection & Annotation Platform**

RLFlow is a full-stack platform for collecting human feedback on LLM outputs — the same type of infrastructure used to train models like ChatGPT and Claude. Researchers create tasks, an LLM generates responses, human annotators rate the outputs, and the system exports clean RLHF datasets in JSONL format ready for fine-tuning.

🔗 **Live Demo:** https://rl-platform-frontend.onrender.com  
📡 **API Docs:** https://rl-platform-api.onrender.com/docs

---

## Architecture

```
React Frontend → FastAPI → PostgreSQL
                    ↓
              Celery Workers ← Redis (Upstash)
                    ↓
              Quality Scoring Pipeline
                    ↓
              JSONL Export → Browser Download
```

**5-layer system:**
- **Frontend** — React + TypeScript + Tailwind, role-based UI for researchers and annotators
- **API** — FastAPI with async SQLAlchemy, JWT auth, Pydantic validation
- **Workers** — Celery async task queue for non-blocking quality score computation
- **Database** — PostgreSQL with 6 tables: users, tasks, task_assignments, agent_outputs, feedback, export_jobs
- **Observability** — Prometheus metrics pushed to Grafana Cloud dashboards

---

## Features

### For Researchers
- Create annotation tasks with custom prompts and task types
- Generate LLM responses via Groq (llama-3.1-8b-instant)
- Assign tasks to annotators with automatic workload balancing
- Monitor task completion status in real time
- Export completed datasets as JSONL with quality score filtering

### For Annotators
- Personal annotation queue with assigned tasks
- View LLM-generated responses inline
- Submit reward scores (0-1) with rationale
- Skip tasks when needed

### Quality Scoring Pipeline
Every piece of feedback is automatically scored by a Celery worker on 3 signals:
- **Rationale length** (0.0 - 0.4) — rewards detailed explanations
- **Reward distribution** (0.0 - 0.3) — penalizes lazy 0/1 ratings
- **Inter-annotator consistency** (0.0 - 0.3) — deviation from other annotators on the same task

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Query |
| Backend | FastAPI, Python 3.12, SQLAlchemy (async), Alembic, Pydantic |
| Database | PostgreSQL |
| Task Queue | Celery + Redis (Upstash) |
| LLM | Groq API (llama-3.1-8b-instant) |
| Monitoring | Prometheus + Grafana Cloud |
| Deployment | Render (API + Frontend + Worker), Upstash (Redis) |
| CI/CD | GitHub Actions |

---

## Security

- **JWT authentication** — all endpoints protected, role enforced per request
- **Password hashing** — bcrypt with SHA-256 pre-hashing
- **Rate limiting** — login (10/min), registration (5/min) per IP via slowapi
- **CORS** — locked to frontend origin, no wildcard
- **Environment variables** — all secrets stored as env vars, never in code

---

## Local Development

### Prerequisites
- Docker + Docker Compose
- Groq API key (free at console.groq.com)

### Setup

```bash
git clone https://github.com/yourusername/rl-platform
cd rl-platform
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://rluser:rlpassword@db:5432/rlplatform
REDIS_URL=redis://redis:6379
SECRET_KEY=your-secret-key
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.1-8b-instant
ENVIRONMENT=development
```

Start all services:
```bash
docker compose up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

### Create your first user
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"researcher@example.com","password":"password123","role":"researcher"}'
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/tasks` | List tasks |
| POST | `/api/v1/tasks` | Create task |
| POST | `/api/v1/tasks/{id}/generate` | Generate LLM response |
| POST | `/api/v1/tasks/{id}/assign` | Assign to annotator |
| GET | `/api/v1/annotator/queue` | Get annotation queue |
| POST | `/api/v1/feedback` | Submit feedback |
| POST | `/api/v1/exports` | Export dataset as JSONL |

Full interactive docs at `/docs`.

---

## Deployment

Deployed on Render free tier:
- **API** — Docker web service with Alembic migrations on startup
- **Worker** — Celery worker co-located with uvicorn (free tier workaround)
- **Frontend** — Node web service with Vite preview
- **Database** — Render PostgreSQL
- **Redis** — Upstash (TLS)

CI/CD via GitHub Actions — push to `main` triggers automatic deployment of all 3 services.

---

## Dataset Export Format

Exported JSONL files follow the standard RLHF training format:

```json
{
  "prompt": "Explain the concept of gradient descent",
  "response": "Gradient descent is an optimization algorithm...",
  "reward": 0.85,
  "rationale": "Clear explanation with good examples",
  "quality_score": 0.9,
  "task_type": "explanation",
  "task_id": "uuid",
  "feedback_id": "uuid"
}
```

---

## Monitoring

Metrics are pushed from Prometheus to Grafana Cloud every 60 seconds. Dashboard includes:
- Request rate by endpoint
- P95 response latency
- Error rate (4xx/5xx)
- Requests breakdown by handler and method

---

## Roadmap

- [ ] Custom domain
- [ ] Email notifications for task assignments
- [ ] Multi-model support (OpenAI, Anthropic)
- [ ] Dataset versioning
- [ ] Annotator performance analytics
- [ ] A/B testing for prompt variants
