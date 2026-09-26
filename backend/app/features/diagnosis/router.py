"""
Diagnosis router — POST /session/{id}/diagnose

Router responsibilities:
- Validate request shape
- Apply rate limiting
- Call into DiagnosisService
- Return DiagnosisResponse

No business logic here.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import RateLimiter, get_db
from app.features.diagnosis.schemas import DiagnoseRequest, DiagnosisResponse
from app.features.diagnosis.service import DiagnosisService

router = APIRouter(prefix="/session", tags=["diagnosis"])

_rate_limit = RateLimiter("diagnose")


@router.post(
    "/{session_id}/diagnose",
    response_model=DiagnosisResponse,
    status_code=status.HTTP_200_OK,
    summary="Run the diagnosis pipeline for a session",
    description=(
        "Builds the event correlation graph, ranks root causes, and generates "
        "a natural-language explanation (LLM with template fallback). "
        "Returns ranked root causes and an explanation. "
        "Set include_graph=true in the body to include the full correlation graph snapshot."
    ),
)
async def diagnose_session(
    session_id: uuid.UUID,
    request: DiagnoseRequest = DiagnoseRequest(),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(_rate_limit),
) -> DiagnosisResponse:
    service = DiagnosisService(db)
    return await service.run_diagnosis(session_id=session_id, request=request)
