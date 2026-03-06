import ssl
from celery import Celery
from app.core.config import settings

is_rediss = settings.redis_url.startswith("rediss://")

ssl_config = {
    "ssl_cert_reqs": ssl.CERT_NONE
} if is_rediss else None

celery_app = Celery(
    "rl_platform",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    broker_use_ssl=ssl_config,
    redis_backend_use_ssl=ssl_config,
)