"""
Diagnosis schemas — request/response Pydantic models.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DiagnoseRequest(BaseModel):
    """Optional parameters for POST /session/{id}/diagnose."""
    top_n: int = Field(10, ge=1, le=50, description="Maximum number of root causes to return")
    include_graph: bool = Field(False, description="Include the full correlation graph in the response")


class RootCauseItem(BaseModel):
    event_id: str
    score: float
    rank: int
    reason: str
    contributing_factors: Dict[str, float]


class DiagnosisResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    status: str
    root_causes: List[RootCauseItem]
    explanation: Optional[str] = None
    explanation_source: Optional[str] = None  # "llm" | "template"
    events_analysed: Optional[int] = None
    duration_ms: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    graph_snapshot: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}
