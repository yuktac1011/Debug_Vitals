"""
Diagnosis service — orchestrates correlation, ranking, and reasoning.

Pipeline:
  1. Load all events for the session
  2. Build correlation graph (CorrelationService)
  3. Rank root causes (root_cause_ranker)
  4. Generate explanation (reasoning_engine — LLM with template fallback)
  5. Persist Diagnosis record
  6. Return DiagnosisResponse
"""

import logging
import structlog
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.correlation.service import CorrelationService
from app.features.correlation.subfeatures.graph_builder.builder import graph_to_dict
from app.features.diagnosis.repository import DiagnosisRepository
from app.features.diagnosis.schemas import DiagnoseRequest, DiagnosisResponse, RootCauseItem
from app.features.diagnosis.subfeatures.reasoning_engine.llm_client import generate_explanation
from app.features.diagnosis.subfeatures.root_cause_ranker.ranker import rank_root_causes
from app.features.events.repository import EventRepository
from app.models.diagnosis import Diagnosis

logger = structlog.get_logger(__name__)


class DiagnosisService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._diagnosis_repo = DiagnosisRepository(db)
        self._event_repo = EventRepository(db)
        self._correlation_service = CorrelationService(db)

    async def run_diagnosis(
        self,
        session_id: uuid.UUID,
        request: DiagnoseRequest,
    ) -> DiagnosisResponse:
        """
        Run the full diagnosis pipeline for a session.
        Creates and persists a Diagnosis record; returns the completed response.
        """
        start_time = time.perf_counter()

        # Create a pending diagnosis record immediately so it's visible
        diagnosis = Diagnosis(
            session_id=session_id,
            status="running",
            created_at=datetime.now(timezone.utc),
        )
        await self._diagnosis_repo.create(diagnosis)
        await self._db.commit()

        try:
            # Step 1: Load events
            events = await self._event_repo.get_by_session(
                session_id=session_id, limit=10_000
            )
            events_by_id = {str(e.id): e for e in events}
            logger.info(
                "Diagnosis: events loaded",
                session_id=str(session_id),
                count=len(events),
            )

            # Step 2: Build correlation graph
            G = await self._correlation_service.build_graph(session_id)

            # Step 3: Rank root causes
            ranked = rank_root_causes(G, events_by_id, top_n=request.top_n)

            root_cause_dicts = []
            for cause in ranked:
                d = cause.to_dict()
                # Enrich with event_type for template selection
                event = events_by_id.get(cause.event_id)
                if event:
                    d["event_type"] = event.event_type
                    d["payload"] = event.payload or {}
                root_cause_dicts.append(d)

            # Step 4: Generate explanation
            explanation, explanation_source = await generate_explanation(
                root_causes=root_cause_dicts,
                session_id=str(session_id),
                total_events=len(events),
                graph_edge_count=G.number_of_edges(),
            )

            # Step 5: Persist completed diagnosis
            duration_ms = (time.perf_counter() - start_time) * 1000
            graph_snapshot = graph_to_dict(G) if request.include_graph else None

            diagnosis.status = "completed"
            diagnosis.root_causes = root_cause_dicts
            diagnosis.explanation = explanation
            diagnosis.explanation_source = explanation_source
            diagnosis.events_analysed = len(events)
            diagnosis.graph_snapshot = graph_snapshot
            diagnosis.duration_ms = round(duration_ms, 2)
            diagnosis.completed_at = datetime.now(timezone.utc)

            await self._diagnosis_repo.save(diagnosis)
            await self._db.commit()

            logger.info(
                "Diagnosis completed",
                session_id=str(session_id),
                diagnosis_id=str(diagnosis.id),
                duration_ms=duration_ms,
                top_cause_score=root_cause_dicts[0]["score"] if root_cause_dicts else 0,
            )

            return self._to_response(diagnosis, include_graph=request.include_graph)

        except Exception as exc:
            diagnosis.status = "failed"
            await self._diagnosis_repo.save(diagnosis)
            await self._db.commit()
            logger.exception(
                "Diagnosis pipeline failed",
                session_id=str(session_id),
                error=str(exc),
            )
            raise

    def _to_response(self, diagnosis: Diagnosis, include_graph: bool = False) -> DiagnosisResponse:
        root_causes = [
            RootCauseItem(
                event_id=rc["event_id"],
                score=rc["score"],
                rank=rc["rank"],
                reason=rc["reason"],
                contributing_factors=rc.get("contributing_factors", {}),
            )
            for rc in (diagnosis.root_causes or [])
        ]
        return DiagnosisResponse(
            id=diagnosis.id,
            session_id=diagnosis.session_id,
            status=diagnosis.status,
            root_causes=root_causes,
            explanation=diagnosis.explanation,
            explanation_source=diagnosis.explanation_source,
            events_analysed=diagnosis.events_analysed,
            duration_ms=diagnosis.duration_ms,
            created_at=diagnosis.created_at,
            completed_at=diagnosis.completed_at,
            graph_snapshot=diagnosis.graph_snapshot if include_graph else None,
        )
