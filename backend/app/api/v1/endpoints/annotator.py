from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime, timezone

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import AssignmentStatus, Task, TaskAssignment, User
from app.schemas.queue import QueueItemOut

router = APIRouter(prefix="/annotator", tags=["annotator"])


@router.get("/queue", response_model=list[QueueItemOut])
async def get_my_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all pending and in-progress assignments for the current annotator."""
    result = await db.execute(
        select(TaskAssignment, Task)
        .join(Task, TaskAssignment.task_id == Task.id)
        .where(
            TaskAssignment.annotator_id == current_user.id,
            TaskAssignment.status.in_([
                AssignmentStatus.pending,
                AssignmentStatus.in_progress,
            ]),
        )
        .order_by(TaskAssignment.assigned_at.asc())
    )
    rows = result.all()

    return [
        QueueItemOut(
            assignment_id=assignment.id,
            task_id=task.id,
            task_title=task.title,
            task_type=task.type,
            task_prompt=task.prompt,
            status=assignment.status,
            assigned_at=assignment.assigned_at,
        )
        for assignment, task in rows
    ]


@router.post("/queue/{assignment_id}/start", response_model=QueueItemOut)
async def start_assignment(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark an assignment as in-progress when the annotator opens it."""
    result = await db.execute(
        select(TaskAssignment, Task)
        .join(Task, TaskAssignment.task_id == Task.id)
        .where(
            TaskAssignment.id == assignment_id,
            TaskAssignment.annotator_id == current_user.id,
        )
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment, task = row
    if assignment.status == AssignmentStatus.completed:
        raise HTTPException(status_code=400, detail="Assignment already completed")

    assignment.status = AssignmentStatus.in_progress
    await db.flush()

    return QueueItemOut(
        assignment_id=assignment.id,
        task_id=task.id,
        task_title=task.title,
        task_type=task.type,
        task_prompt=task.prompt,
        status=assignment.status,
        assigned_at=assignment.assigned_at,
    )


@router.post("/queue/{assignment_id}/skip")
async def skip_assignment(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Annotator skips a task — it goes back to the pool."""
    result = await db.execute(
        select(TaskAssignment).where(
            TaskAssignment.id == assignment_id,
            TaskAssignment.annotator_id == current_user.id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.status == AssignmentStatus.completed:
        raise HTTPException(status_code=400, detail="Assignment already completed")

    assignment.status = AssignmentStatus.skipped
    await db.flush()
    return {"message": "Assignment skipped"}
