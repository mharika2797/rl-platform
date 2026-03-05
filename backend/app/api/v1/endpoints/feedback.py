import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from app.models.models import Task, TaskStatus
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.api.deps import get_current_user, require_researcher
from app.db.session import get_db
from app.models.models import (
    AgentOutput,
    AssignmentStatus,
    Feedback,
    TaskAssignment,
    User,
)
from app.schemas.feedback import (
    AgentOutputCreate,
    AgentOutputOut,
    FeedbackOut,
    FeedbackSubmit,
)
from app.workers.tasks import compute_quality_score

router = APIRouter(tags=["feedback"])


# ── Agent Outputs ─────────────────────────────────────────────────────────────

@router.post("/agent-outputs", response_model=AgentOutputOut, status_code=status.HTTP_201_CREATED)
async def create_agent_output(
    payload: AgentOutputCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_researcher),
):
    """Attach an agent's response to a task so annotators can rate it."""
    output = AgentOutput(
        task_id=payload.task_id,
        model_id=payload.model_id,
        output=payload.output,
    )
    db.add(output)
    await db.flush()
    await db.refresh(output)
    return output


@router.get("/tasks/{task_id}/agent-outputs", response_model=list[AgentOutputOut])
async def list_agent_outputs(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AgentOutput).where(AgentOutput.task_id == task_id)
    )
    return result.scalars().all()


# ── Feedback ──────────────────────────────────────────────────────────────────

@router.post("/feedback", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Annotator submits a reward signal and optional rationale for an assignment.
    Triggers async quality score computation.
    """
    # Verify assignment exists and belongs to this annotator
    result = await db.execute(
        select(TaskAssignment).where(TaskAssignment.id == payload.assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.annotator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your assignment")
    if assignment.status == AssignmentStatus.completed:
        raise HTTPException(status_code=400, detail="Assignment already completed")

    # Validate agent output belongs to the same task
    if payload.agent_output_id:
        ao_result = await db.execute(
            select(AgentOutput).where(AgentOutput.id == payload.agent_output_id)
        )
        agent_output = ao_result.scalar_one_or_none()
        if not agent_output or agent_output.task_id != assignment.task_id:
            raise HTTPException(status_code=400, detail="Agent output does not belong to this task")

    feedback = Feedback(
        assignment_id=payload.assignment_id,
        agent_output_id=payload.agent_output_id,
        reward_scalar=payload.reward_scalar,
        rationale=payload.rationale,
    )
    db.add(feedback)

    # Mark assignment complete
    assignment.status = AssignmentStatus.completed
    assignment.completed_at = datetime.now(timezone.utc)

    # Flush first so the completed status is visible to the check below
    await db.flush()
    await db.refresh(feedback)

    # Now check if ALL assignments for this task are done
    all_assignments_result = await db.execute(
        select(TaskAssignment).where(TaskAssignment.task_id == assignment.task_id)
    )
    all_assignments = all_assignments_result.scalars().all()

    all_done = all(
        a.status in [AssignmentStatus.completed, AssignmentStatus.skipped]
        for a in all_assignments
    )

    if all_done:
        task_result = await db.execute(
            select(Task).where(Task.id == assignment.task_id)
        )
        task = task_result.scalar_one_or_none()
        if task:
            task.status = TaskStatus.completed
            await db.flush()

    # Trigger async quality scoring
    compute_quality_score.delay(str(feedback.id))

    return feedback

@router.get("/feedback/{task_id}", response_model=list[FeedbackOut])
async def get_task_feedback(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_researcher),
):
    """Get all feedback submitted for a task (researchers only)."""
    result = await db.execute(
        select(Feedback)
        .join(TaskAssignment, Feedback.assignment_id == TaskAssignment.id)
        .where(TaskAssignment.task_id == task_id)
    )
    return result.scalars().all()


@router.get("/feedback/my/submissions", response_model=list[FeedbackOut])
async def my_feedback(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Annotator views their own submitted feedback."""
    result = await db.execute(
        select(Feedback)
        .join(TaskAssignment, Feedback.assignment_id == TaskAssignment.id)
        .where(TaskAssignment.annotator_id == current_user.id)
        .order_by(Feedback.submitted_at.desc())
    )
    return result.scalars().all()
