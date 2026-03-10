#!/bin/bash
pip install -q groq==0.13.0
celery -A app.workers.celery_app worker --loglevel=info &
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}