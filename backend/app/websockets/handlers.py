"""
WebSocket handlers and route definitions.

Clients connect to /ws/session/{session_id} to receive real-time updates
for that session: event ingestion confirmations, diagnosis progress,
verification results, and regression test outcomes.

Message format (server → client):
{
    "type": str,      # event_ingested | diagnosis_started | diagnosis_complete |
                       #  verification_update | regression_update | error
    "session_id": str,
    "payload": dict
}

Message format (client → server):
{
    "type": "ping"    # keepalive
}
"""

import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websockets.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websockets"])


@router.websocket("/session/{session_id}")
async def websocket_session_endpoint(
    websocket: WebSocket,
    session_id: uuid.UUID,
) -> None:
    """
    WebSocket endpoint scoped to a single session.
    The client receives all real-time updates for the session.
    """
    await manager.connect(websocket, session_id)
    try:
        # Send an initial connected acknowledgement
        await websocket.send_json({
            "type": "connected",
            "session_id": str(session_id),
            "payload": {
                "message": f"Subscribed to session {session_id}",
                "connections": manager.session_connection_count(session_id),
            },
        })

        # Message loop — primarily for client→server keepalives
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "session_id": str(session_id),
                    "payload": {},
                })
            else:
                logger.debug(
                    "Unhandled WebSocket message type",
                    msg_type=msg_type,
                    session_id=str(session_id),
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
    except Exception as exc:
        logger.exception(
            "WebSocket error",
            session_id=str(session_id),
            error=str(exc),
        )
        manager.disconnect(websocket, session_id)


# ── Broadcast helpers called from service layers ───────────────────────────────

async def broadcast_event_ingested(session_id: uuid.UUID, event_ids: list) -> None:
    await manager.broadcast(
        session_id,
        {
            "type": "events_ingested",
            "session_id": str(session_id),
            "payload": {"accepted": [str(i) for i in event_ids]},
        },
    )


async def broadcast_diagnosis_update(
    session_id: uuid.UUID, status: str, diagnosis_id: str
) -> None:
    await manager.broadcast(
        session_id,
        {
            "type": "diagnosis_update",
            "session_id": str(session_id),
            "payload": {"status": status, "diagnosis_id": diagnosis_id},
        },
    )


async def broadcast_verification_update(
    session_id: uuid.UUID, verification_id: str, status: str
) -> None:
    await manager.broadcast(
        session_id,
        {
            "type": "verification_update",
            "session_id": str(session_id),
            "payload": {"verification_id": verification_id, "status": status},
        },
    )
