import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.compute_quality_score")
def compute_quality_score(feedback_id: str) -> dict:
    """
    Phase 4: Compute quality score for a feedback submission.
    Checks inter-annotator agreement, reward distribution outliers, etc.
    """
    logger.info(f"Computing quality score for feedback {feedback_id}")
    # TODO: Implement in Phase 4
    return {"feedback_id": feedback_id, "quality_score": None}


@celery_app.task(name="tasks.build_export")
def build_export(export_job_id: str) -> dict:
    """
    Phase 4: Generate JSONL/Parquet export file from filtered feedback.
    """
    logger.info(f"Building export for job {export_job_id}")
    # TODO: Implement in Phase 4
    return {"export_job_id": export_job_id, "status": "pending"}


@celery_app.task(name="tasks.assign_task")
def assign_task_to_annotators(task_id: str) -> dict:
    """
    Phase 2: Distribute a task to available annotators based on workload.
    """
    logger.info(f"Assigning task {task_id} to annotators")
    # TODO: Implement in Phase 2
    return {"task_id": task_id, "assigned": []}
