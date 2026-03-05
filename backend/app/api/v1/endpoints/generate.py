import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from groq import Groq

from app.api.deps import require_researcher
from app.core.config import settings
from app.db.session import get_db
from app.models.models import AgentOutput, Task, User
from app.schemas.feedback import AgentOutputOut

router = APIRouter(tags=["generate"])


@router.post("/tasks/{task_id}/generate", response_model=AgentOutputOut)
async def generate_response(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_researcher),
):
    """Call Groq LLM with the task prompt and store the response as an agent output."""

    # Fetch task
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if not settings.groq_api_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    # Call Groq
    try:
        client = Groq(api_key=settings.groq_api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI assistant. Answer the prompt clearly and concisely.",
                },
                {
                    "role": "user",
                    "content": task.prompt,
                },
            ],
            model=settings.groq_model,
        )
        generated_text = chat_completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    # Store as agent output
    agent_output = AgentOutput(
        task_id=task_id,
        model_id=settings.groq_model,
        output=generated_text,
    )
    db.add(agent_output)
    await db.flush()
    await db.refresh(agent_output)

    return agent_output