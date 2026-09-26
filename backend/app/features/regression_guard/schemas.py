"""
Regression guard schemas — request/response models.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class RegressionGuardRequest(BaseModel):
    diagnosis_id: uuid.UUID = Field(
        ..., description="The diagnosis to generate regression tests for"
    )
    top_n_causes: int = Field(
        3, ge=1, le=10,
        description="Generate tests for the top N root causes"
    )
    docker_image: str = Field(
        "python:3.11-slim",
        max_length=512,
        description="Docker image to run the tests in",
    )
    run_immediately: bool = Field(
        False,
        description="If true, run the generated tests immediately in a container",
    )
    language: Optional[str] = Field(
        None,
        description="Programming language (overrides auto-detection from env snapshots)",
    )


class RegressionTestItem(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    diagnosis_id: Optional[uuid.UUID] = None
    test_code: Optional[str] = None
    test_framework: Optional[str] = None
    target_file_path: Optional[str] = None
    generation_status: str
    run_status: Optional[str] = None
    run_output: Optional[str] = None
    is_active: bool
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    last_run_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RegressionGuardResponse(BaseModel):
    session_id: uuid.UUID
    diagnosis_id: uuid.UUID
    tests_generated: int
    tests_run: int
    tests_passed: int
    tests_failed: int
    tests: List[RegressionTestItem]
