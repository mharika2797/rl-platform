import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class FeedbackSubmit(BaseModel):
    assignment_id: uuid.UUID
    agent_output_id: uuid.UUID | None = None
    reward_scalar: float | None = Field(None, ge=0.0, le=1.0)
    rationale: str | None = Field(None, min_length=5)


class FeedbackOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    assignment_id: uuid.UUID
    agent_output_id: uuid.UUID | None
    reward_scalar: float | None
    rationale: str | None
    quality_score: float | None
    submitted_at: datetime


class AgentOutputCreate(BaseModel):
    task_id: uuid.UUID
    model_id: str = Field(..., min_length=1)
    output: str = Field(..., min_length=1)


class AgentOutputOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    task_id: uuid.UUID
    model_id: str
    output: str
    generated_at: datetime
