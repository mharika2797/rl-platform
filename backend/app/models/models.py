import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> uuid.UUID:
    return uuid.uuid4()


# ── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    researcher = "researcher"
    annotator = "annotator"
    admin = "admin"


class TaskType(str, enum.Enum):
    coding = "coding"
    reasoning = "reasoning"
    qa = "qa"


class TaskStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    completed = "completed"
    archived = "archived"


class AssignmentStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    skipped = "skipped"


class ExportFormat(str, enum.Enum):
    jsonl = "jsonl"
    parquet = "parquet"
    csv = "csv"


class ExportStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


# ── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.annotator)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    tasks: Mapped[list["Task"]] = relationship(back_populates="creator")
    assignments: Mapped[list["TaskAssignment"]] = relationship(back_populates="annotator")
    export_jobs: Mapped[list["ExportJob"]] = relationship(back_populates="created_by_user")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    creator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[TaskType] = mapped_column(Enum(TaskType), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    expected_behavior: Mapped[str | None] = mapped_column(Text)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.draft)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    creator: Mapped["User"] = relationship(back_populates="tasks")
    assignments: Mapped[list["TaskAssignment"]] = relationship(back_populates="task")
    agent_outputs: Mapped[list["AgentOutput"]] = relationship(back_populates="task")


class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tasks.id"), nullable=False)
    annotator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[AssignmentStatus] = mapped_column(Enum(AssignmentStatus), default=AssignmentStatus.pending)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    task: Mapped["Task"] = relationship(back_populates="assignments")
    annotator: Mapped["User"] = relationship(back_populates="assignments")
    feedback: Mapped[list["Feedback"]] = relationship(back_populates="assignment")


class AgentOutput(Base):
    __tablename__ = "agent_outputs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tasks.id"), nullable=False)
    model_id: Mapped[str] = mapped_column(String(255), nullable=False)
    output: Mapped[str] = mapped_column(Text, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    task: Mapped["Task"] = relationship(back_populates="agent_outputs")
    feedback: Mapped[list["Feedback"]] = relationship(back_populates="agent_output")


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("task_assignments.id"), nullable=False)
    agent_output_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("agent_outputs.id"))
    reward_scalar: Mapped[float | None] = mapped_column(Float)  # 0.0–1.0
    rationale: Mapped[str | None] = mapped_column(Text)
    quality_score: Mapped[float | None] = mapped_column(Float)  # computed by worker
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    assignment: Mapped["TaskAssignment"] = relationship(back_populates="feedback")
    agent_output: Mapped["AgentOutput | None"] = relationship(back_populates="feedback")


class ExportJob(Base):
    __tablename__ = "export_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    format: Mapped[ExportFormat] = mapped_column(Enum(ExportFormat), default=ExportFormat.jsonl)
    filters: Mapped[dict | None] = mapped_column(JSONB)
    file_url: Mapped[str | None] = mapped_column(String(1000))
    status: Mapped[ExportStatus] = mapped_column(Enum(ExportStatus), default=ExportStatus.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_by_user: Mapped["User"] = relationship(back_populates="export_jobs")
