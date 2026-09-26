"""
Verification schemas — request/response models.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class VerifyRequest(BaseModel):
    docker_image: str = Field(
        "python:3.11-slim",
        description="Docker image for the isolated run (must be in the approved allowlist)",
        max_length=512,
    )
    command: str = Field(
        ...,
        description="Shell command to execute inside the container",
        max_length=4096,
    )
    environment: Optional[Dict[str, str]] = Field(
        None,
        description="Environment variables to inject (sensitive keys are rejected)",
    )
    diagnosis_id: Optional[uuid.UUID] = Field(
        None,
        description="Link this verification run to an existing diagnosis",
    )


class VerificationResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    diagnosis_id: Optional[uuid.UUID] = None
    status: str
    docker_image: Optional[str] = None
    command: Optional[str] = None
    exit_code: Optional[int] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    run_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
