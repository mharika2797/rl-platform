import logging
import json
import os
from datetime import datetime, timezone

from celery import shared_task
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def get_sync_engine():
    from app.core.config import settings
    sync_url = settings.database_url
    if sync_url.startswith("postgresql+asyncpg://"):
        sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if sync_url.startswith("postgres://"):
        sync_url = sync_url.replace("postgres://", "postgresql://", 1)
    return create_engine(sync_url)


@celery_app.task(name="app.workers.tasks.compute_quality_score")
def compute_quality_score(feedback_id: str) -> dict:
    """Compute quality score for a feedback submission."""
    from app.models.models import Feedback, TaskAssignment

    logger.info(f"Computing quality score for feedback {feedback_id}")

    engine = get_sync_engine()
    with Session(engine) as db:
        feedback = db.execute(
            select(Feedback).where(Feedback.id == feedback_id)
        ).scalar_one_or_none()

        if not feedback:
            logger.error(f"Feedback {feedback_id} not found")
            return {"feedback_id": feedback_id, "quality_score": None}

        score = 0.0

        # Rationale length (0.0 - 0.4)
        if feedback.rationale:
            length = len(feedback.rationale.strip())
            if length > 100:
                score += 0.4
            elif length > 50:
                score += 0.3
            elif length > 20:
                score += 0.2
            else:
                score += 0.1

        # Reward not at extremes (0.0 - 0.3)
        if feedback.reward_scalar is not None:
            if 0.1 < feedback.reward_scalar < 0.9:
                score += 0.3
            else:
                score += 0.1

        # Inter-annotator consistency (0.0 - 0.3)
        assignment = db.execute(
            select(TaskAssignment).where(TaskAssignment.id == feedback.assignment_id)
        ).scalar_one_or_none()

        if assignment:
            other_feedback = db.execute(
                select(Feedback)
                .join(TaskAssignment, Feedback.assignment_id == TaskAssignment.id)
                .where(
                    TaskAssignment.task_id == assignment.task_id,
                    Feedback.id != feedback.id,
                    Feedback.reward_scalar.isnot(None)
                )
            ).scalars().all()

            if other_feedback and feedback.reward_scalar is not None:
                avg_reward = sum(f.reward_scalar for f in other_feedback) / len(other_feedback)
                deviation = abs(feedback.reward_scalar - avg_reward)
                if deviation < 0.2:
                    score += 0.3
                elif deviation < 0.4:
                    score += 0.2
                else:
                    score += 0.1
            else:
                score += 0.2
        else:
            score += 0.2

        final_score = round(min(score, 1.0), 2)
        feedback.quality_score = final_score
        db.commit()

        logger.info(f"Quality score for {feedback_id}: {final_score}")
        return {"feedback_id": feedback_id, "quality_score": final_score}


@celery_app.task(name="app.workers.tasks.assign_task")
def assign_task_to_annotators(task_id: str) -> dict:
    """Distribute a task to available annotators based on workload."""
    logger.info(f"Assigning task {task_id} to annotators")
    return {"task_id": task_id, "assigned": []}


@celery_app.task(name="app.workers.tasks.build_export")
def build_export(export_job_id: str) -> dict:
    """Generate JSONL export file from filtered feedback."""
    from app.models.models import (
        AgentOutput, ExportJob, ExportStatus,
        Feedback, Task, TaskAssignment
    )

    engine = get_sync_engine()
    with Session(engine) as db:
        job = db.execute(
            select(ExportJob).where(ExportJob.id == export_job_id)
        ).scalar_one_or_none()

        if not job:
            return {"error": "Export job not found"}

        job.status = ExportStatus.processing
        db.commit()

        try:
            filters = job.filters or {}
            min_quality = filters.get("min_quality_score", 0.0)
            task_ids = filters.get("task_ids", None)

            query = (
                select(Feedback, TaskAssignment, Task, AgentOutput)
                .join(TaskAssignment, Feedback.assignment_id == TaskAssignment.id)
                .join(Task, TaskAssignment.task_id == Task.id)
                .outerjoin(AgentOutput, Feedback.agent_output_id == AgentOutput.id)
                .where(Feedback.reward_scalar.isnot(None))
            )

            if min_quality > 0:
                query = query.where(
                    (Feedback.quality_score >= min_quality) |
                    Feedback.quality_score.is_(None)
                )

            if task_ids:
                query = query.where(Task.id.in_(task_ids))

            records = db.execute(query).all()

            export_dir = "/tmp/exports"
            os.makedirs(export_dir, exist_ok=True)
            filename = f"rl_dataset_{export_job_id[:8]}.jsonl"
            filepath = f"{export_dir}/{filename}"

            with open(filepath, "w") as f:
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
                    f.write(json.dumps(record) + "\n")

            job.status = ExportStatus.completed
            job.file_url = filepath
            job.completed_at = datetime.now(timezone.utc)
            db.commit()

            logger.info(f"Export {export_job_id} completed: {len(records)} records")
            return {"export_job_id": export_job_id, "records": len(records), "file": filepath}

        except Exception as e:
            job.status = ExportStatus.failed
            db.commit()
            logger.error(f"Export {export_job_id} failed: {e}")
            raise