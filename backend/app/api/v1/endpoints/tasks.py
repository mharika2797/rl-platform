import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_researcher
from app.db.session import get_db
from app.models.models import AssignmentStatus, Task, TaskAssignment, TaskStatus, User
from app.schemas.tasks import (
    TaskAssignRequest,
    TaskAssignmentOut,
    TaskCreate,
    TaskListOut,
    TaskOut,
    TaskUpdate,
)
from app.workers.tasks import assign_task_to_annotators

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=TaskListOut)
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: TaskStatus | None = None,
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Task)
    if status:
        query = query.where(Task.status == status)
    if type:
        query = query.where(Task.type == type)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    query = query.offset((page - 1) * page_size).limit(page_size).order_by(Task.created_at.desc())
    result = await db.execute(query)
    tasks = result.scalars().all()

    return TaskListOut(items=tasks, total=total, page=page, page_size=page_size)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_researcher),
):
    task = Task(
        creator_id=current_user.id,
        title=payload.title,
        type=payload.type,
        prompt=payload.prompt,
        expected_behavior=payload.expected_behavior,
        metadata_=payload.metadata,
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_researcher),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.creator_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not your task")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(task, field, value)

    task.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(task)
    return task


@router.post("/{task_id}/assign", response_model=list[TaskAssignmentOut])
async def assign_task(
    task_id: uuid.UUID,
    payload: TaskAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_researcher),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Validate all annotator IDs exist
    annotator_result = await db.execute(
        select(User).where(User.id.in_(payload.annotator_ids))
    )
    found_users = {u.id for u in annotator_result.scalars().all()}
    missing = set(payload.annotator_ids) - found_users
    if missing:
        raise HTTPException(status_code=400, detail=f"Users not found: {missing}")

    # Skip already-assigned annotators
    existing = await db.execute(
        select(TaskAssignment.annotator_id).where(
            TaskAssignment.task_id == task_id,
            TaskAssignment.annotator_id.in_(payload.annotator_ids),
        )
    )
    already_assigned = {row for row in existing.scalars()}

    assignments = []
    for annotator_id in payload.annotator_ids:
        if annotator_id not in already_assigned:
            assignment = TaskAssignment(task_id=task_id, annotator_id=annotator_id)
            db.add(assignment)
            assignments.append(assignment)

    # Activate task if still draft
    if task.status == TaskStatus.draft:
        task.status = TaskStatus.active

    await db.flush()
    for a in assignments:
        await db.refresh(a)

    # Trigger async worker
    assign_task_to_annotators.delay(str(task_id))

    return assignments


@router.get("/{task_id}/assignments", response_model=list[TaskAssignmentOut])
async def get_task_assignments(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_researcher),
):
    result = await db.execute(
        select(TaskAssignment).where(TaskAssignment.task_id == task_id)
    )
    return result.scalars().all()
