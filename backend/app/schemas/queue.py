import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.models import AssignmentStatus, TaskType


class QueueItemOut(BaseModel):
    model_config = {"from_attributes": True}

    assignment_id: uuid.UUID
    task_id: uuid.UUID
    task_title: str
    task_type: TaskType
    task_prompt: str
    status: AssignmentStatus
    assigned_at: datetime
