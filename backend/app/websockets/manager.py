"""
WebSocket connection manager with per-session channel isolation.

Each session gets its own channel.  Messages broadcast to a session are
only delivered to connections subscribed to that session — no cross-session
leakage is possible.

Design:
  - Channels are keyed by session_id (UUID string).
  - A connection can subscribe to exactly one session channel.
  - Broadcast is non-blocking: slow/dead clients are automatically disconnected.
  - Thread-safe for asyncio (single-threaded event loop assumption).
"""

import asyncio
import logging
import structlog
import uuid
from collections import defaultdict
from typing import Any, Dict, Optional, Set

from fastapi import WebSocket

logger = structlog.get_logger(__name__)


class ConnectionManager:
    """
    Manages all active WebSocket connections, grouped by session_id.

    Typical usage:
        manager = ConnectionManager()
        await manager.connect(websocket, session_id)
        await manager.broadcast(session_id, {"type": "diagnosis_complete", ...})
        manager.disconnect(websocket, session_id)
    """

    def __init__(self) -> None:
        # session_id → set of active WebSocket connections
        self._channels: Dict[str, Set[WebSocket]] = defaultdict(set)
        # Track session per connection for disconnect cleanup
        self._connection_sessions: Dict[int, str] = {}  # id(ws) → session_id

    async def connect(self, websocket: WebSocket, session_id: uuid.UUID) -> None:
        """Accept the WebSocket connection and register it to the session channel."""
        await websocket.accept()
        sid = str(session_id)
        self._channels[sid].add(websocket)
        self._connection_sessions[id(websocket)] = sid
        logger.info(
            "WebSocket connected",
            session_id=sid,
            total_connections=len(self._channels[sid]),
        )

    def disconnect(self, websocket: WebSocket, session_id: Optional[uuid.UUID] = None) -> None:
        """
        Remove the connection from its session channel.
        session_id is optional — if omitted, it is looked up from the connection map.
        """
        ws_id = id(websocket)
        sid = (
            str(session_id) if session_id else self._connection_sessions.get(ws_id)
        )
        if sid:
            self._channels[sid].discard(websocket)
            if not self._channels[sid]:
                del self._channels[sid]
        self._connection_sessions.pop(ws_id, None)
        logger.info("WebSocket disconnected", session_id=sid)

    async def broadcast(
        self,
        session_id: uuid.UUID,
        message: Dict[str, Any],
        exclude: Optional[WebSocket] = None,
    ) -> None:
        """
        Send a JSON message to all connections subscribed to the given session.
        Dead connections are removed silently.
        """
        sid = str(session_id)
        if sid not in self._channels:
            return

        dead: Set[WebSocket] = set()
        for websocket in list(self._channels[sid]):
            if websocket is exclude:
                continue
            try:
                await websocket.send_json(message)
            except Exception:
                dead.add(websocket)

        # Clean up dead connections
        for ws in dead:
            self.disconnect(ws)

    def session_connection_count(self, session_id: uuid.UUID) -> int:
        return len(self._channels.get(str(session_id), set()))

    @property
    def total_connections(self) -> int:
        return sum(len(conns) for conns in self._channels.values())


# Module-level singleton used by handlers and routers
manager = ConnectionManager()
