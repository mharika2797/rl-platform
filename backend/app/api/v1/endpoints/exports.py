import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import get_current_user, require_researcher
from app.db.session import get_db
from app.models.models import ExportJob, ExportStatus, User
from app.workers.tasks import build_export

router = APIRouter(prefix="/exports", tags=["exports"])


class ExportCreate(BaseModel):
    min_quality_score: float = 0.0
    task_ids: list[uuid.UUID] | None = None


class ExportJobOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    format: str
    status: str
    file_url: str | None
    filters: dict | None
    created_at: str


@router.post("", status_code=202)
async def create_export(
    payload: ExportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_researcher),
):
    """Trigger a new export job."""
    job = ExportJob(
        created_by=current_user.id,
        filters={
            "min_quality_score": payload.min_quality_score,
            "task_ids": [str(t) for t in payload.task_ids] if payload.task_ids else None,
        }
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)

    # Trigger async worker
    build_export.delay(str(job.id))

    return {"export_job_id": str(job.id), "status": "processing"}


@router.get("/{job_id}/status")
async def get_export_status(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_researcher),
):
    result = await db.execute(select(ExportJob).where(ExportJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    return {"id": str(job.id), "status": job.status.value, "file_url": job.file_url}


@router.get("/{job_id}/download")
async def download_export(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_researcher),
):
    result = await db.execute(select(ExportJob).where(ExportJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    if job.status != ExportStatus.completed:
        raise HTTPException(status_code=400, detail="Export not ready yet")
    if not job.file_url:
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=job.file_url,
        filename=f"rl_dataset_{str(job_id)[:8]}.jsonl",
        media_type="application/x-ndjson"
    )


@router.get("")
async def list_exports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_researcher),
):
    result = await db.execute(
        select(ExportJob)
        .where(ExportJob.created_by == current_user.id)
        .order_by(ExportJob.created_at.desc())
    )
    jobs = result.scalars().all()
    return [
        {
            "id": str(j.id),
            "status": j.status.value,
            "file_url": j.file_url,
            "filters": j.filters,
            "created_at": str(j.created_at),
        }
        for j in jobs
    ]