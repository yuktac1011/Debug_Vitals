"""
Regression guard router — POST /session/{id}/regression-guard
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import RateLimiter, get_db
from app.features.regression_guard.schemas import (
    RegressionGuardRequest,
    RegressionGuardResponse,
)
from app.features.regression_guard.service import RegressionGuardService

router = APIRouter(prefix="/session", tags=["regression-guard"])

_rate_limit = RateLimiter("regression")


@router.post(
    "/{session_id}/regression-guard",
    response_model=RegressionGuardResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate (and optionally run) regression tests for a diagnosed session",
    description=(
        "Generates regression tests for the top N root causes of a diagnosis. "
        "If run_immediately=true, tests are executed in an isolated container. "
        "Generated tests are persisted and can be retrieved for integration into the codebase."
    ),
)
async def regression_guard(
    session_id: uuid.UUID,
    request: RegressionGuardRequest,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(_rate_limit),
) -> RegressionGuardResponse:
    service = RegressionGuardService(db)
    return await service.run_regression_guard(session_id=session_id, request=request)
