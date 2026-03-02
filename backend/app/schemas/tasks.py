import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.models import TaskStatus, TaskType


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=500)
    type: TaskType
    prompt: str = Field(..., min_length=10)
    expected_behavior: str | None = None
    metadata: dict | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=500)
    prompt: str | None = None
    expected_behavior: str | None = None
    status: TaskStatus | None = None
    metadata: dict | None = None


class TaskOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    creator_id: uuid.UUID
    title: str
    type: TaskType
    prompt: str
    expected_behavior: str | None
    status: TaskStatus
    metadata_: dict | None = Field(None, alias="metadata_")
    created_at: datetime
    updated_at: datetime


class TaskAssignRequest(BaseModel):
    annotator_ids: list[uuid.UUID] = Field(..., min_length=1)


class TaskAssignmentOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    task_id: uuid.UUID
    annotator_id: uuid.UUID
    status: str
    assigned_at: datetime
    completed_at: datetime | None


class TaskListOut(BaseModel):
    items: list[TaskOut]
    total: int
    page: int
    page_size: int
