from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.tasks import router as tasks_router
from app.api.v1.endpoints.feedback import router as feedback_router
from app.api.v1.endpoints.annotator import router as annotator_router
from app.api.v1.endpoints.generate import router as generate_router


api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(tasks_router)
api_router.include_router(feedback_router)
api_router.include_router(annotator_router)
api_router.include_router(generate_router)
