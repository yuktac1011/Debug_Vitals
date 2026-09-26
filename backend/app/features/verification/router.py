"""
Verification router — POST /session/{id}/verify
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import RateLimiter, get_db
from app.features.verification.schemas import VerificationResponse, VerifyRequest
from app.features.verification.service import VerificationService

router = APIRouter(prefix="/session", tags=["verification"])

_rate_limit = RateLimiter("verify")


@router.post(
    "/{session_id}/verify",
    response_model=VerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Run an isolated verification container for a session",
    description=(
        "Executes the given command inside an isolated Docker container with strict "
        "resource and network limits. Container images must be in the approved allowlist. "
        "Returns exit code, stdout, and stderr."
    ),
)
async def verify_session(
    session_id: uuid.UUID,
    request: VerifyRequest,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(_rate_limit),
) -> VerificationResponse:
    service = VerificationService(db)
    return await service.run_verification(session_id=session_id, request=request)
