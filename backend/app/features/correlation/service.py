"""
Correlation service — orchestrates graph building for a session.
Called internally by the diagnosis service; not a public-facing endpoint.
"""

import logging
import structlog
import uuid
from typing import Any, Dict

import networkx as nx
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.correlation.subfeatures.graph_builder.builder import (
    build_correlation_graph,
    graph_to_dict,
)
from app.features.events.repository import EventRepository

logger = structlog.get_logger(__name__)


class CorrelationService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._event_repo = EventRepository(db)

    async def build_graph(self, session_id: uuid.UUID) -> nx.DiGraph:
        """
        Load all events for the session and build the correlation graph.
        Returns the in-memory NetworkX DiGraph.
        """
        events = await self._event_repo.get_by_session(
            session_id=session_id,
            limit=10_000,  # hard cap — very large sessions still work
        )
        logger.info(
            "Building correlation graph",
            session_id=str(session_id),
            event_count=len(events),
        )
        return build_correlation_graph(events)

    async def build_graph_snapshot(self, session_id: uuid.UUID) -> Dict[str, Any]:
        """
        Build the graph and serialise it to a JSON-friendly dict for storage.
        """
        G = await self.build_graph(session_id)
        return graph_to_dict(G)
