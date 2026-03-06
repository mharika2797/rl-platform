import uuid
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import require_researcher
from app.db.session import get_db
from app.models.models import AgentOutput, Feedback, Task, TaskAssignment, User

router = APIRouter(prefix="/exports", tags=["exports"])


class ExportCreate(BaseModel):
    min_quality_score: float = 0.0
    task_ids: list[uuid.UUID] | None = None


@router.post("")
async def create_export(
    payload: ExportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_researcher),
):
    """Stream JSONL export directly to browser."""

    async def generate():
        query = (
            select(Feedback, TaskAssignment, Task, AgentOutput)
            .join(TaskAssignment, Feedback.assignment_id == TaskAssignment.id)
            .join(Task, TaskAssignment.task_id == Task.id)
            .outerjoin(AgentOutput, Feedback.agent_output_id == AgentOutput.id)
            .where(Feedback.reward_scalar.isnot(None))
        )

        if payload.min_quality_score > 0:
            query = query.where(
                (Feedback.quality_score >= payload.min_quality_score) |
                Feedback.quality_score.is_(None)
            )

        if payload.task_ids:
            query = query.where(Task.id.in_(payload.task_ids))

        rows = await db.execute(query)
        records = rows.all()

        for feedback, assignment, task, agent_output in records:
            record = {
                "prompt": task.prompt,
                "response": agent_output.output if agent_output else None,
                "reward": feedback.reward_scalar,
                "rationale": feedback.rationale,
                "quality_score": feedback.quality_score,
                "task_type": task.type.value,
                "task_id": str(task.id),
                "feedback_id": str(feedback.id),
            }
            yield json.dumps(record) + "\n"

    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson",
        headers={
            "Content-Disposition": "attachment; filename=rl_dataset.jsonl"
        }
    )


@router.get("")
async def list_exports(
    current_user: User = Depends(require_researcher),
):
    return []