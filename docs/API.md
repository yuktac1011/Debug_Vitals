# AgentDoctor — API Reference

Base URL (example): `https://agentdoctor-api.onrender.com`

## Authentication
None for MVP (single global demo instance, no multi-tenant auth — see PRD.md non-goals).

## Endpoints

### `POST /events`
Ingest a single observed event.

**Request**
```json
{
  "session_id": "uuid",
  "event_type": "agent_action | git_change | env_change | dependency_change | test_result | ci_result",
  "payload": { "...": "event-type-specific fields" },
  "timestamp": "2026-09-26T10:31:00Z"
}
```

**Response** `200 OK`
```json
{ "status": "recorded", "event_id": "uuid" }
```

---

### `GET /session/{session_id}/timeline`
Returns the full ordered event history for a session.

**Response** `200 OK`
```json
{
  "session_id": "uuid",
  "events": [
    { "event_id": "uuid", "event_type": "...", "payload": {...}, "timestamp": "..." }
  ]
}
```

---

### `POST /session/{session_id}/diagnose`
Runs correlation + root-cause ranking + reasoning generation on the session's current events.

**Response** `200 OK`
```json
{
  "root_cause": "Node version mismatch introduced after agent changed runtime configuration",
  "evidence": [
    "Agent modified package.json",
    "Required Node version changed from 20 to 22",
    "CI is running Node 20",
    "7 tests failed immediately after the change"
  ],
  "confidence": 82,
  "affected_components": ["package.json", "CI runner config"],
  "suggested_next_step": "Verify by rerunning the failing tests under Node 22"
}
```

---

### `POST /session/{session_id}/verify`
Triggers an isolated rerun to test the diagnosed hypothesis.

**Request**
```json
{ "hypothesis": "rerun under Node 22" }
```

**Response** `200 OK`
```json
{
  "result": "passed",
  "confidence_before": 82,
  "confidence_after": 96
}
```

---

### `POST /session/{session_id}/regression-guard`
Generates and runs one targeted test reproducing the confirmed failure. Requires a completed diagnosis for the session.

**Response** `200 OK`
```json
{
  "test_code": "...",
  "result": "passed"
}
```

---

### `WebSocket /ws/{session_id}`
Streams real-time updates for a session: new events, diagnosis completion, verification progress, regression-guard results.

**Message shape (server → client)**
```json
{
  "type": "event_added | diagnosis_ready | verification_progress | verification_complete | regression_complete",
  "data": { "...": "..." }
}
```

---

### `GET /health`
Simple uptime check.

**Response** `200 OK`
```json
{ "status": "ok" }
```

## Error Handling
Standard HTTP status codes. All error responses:
```json
{ "error": "short message", "detail": "optional longer explanation" }
```

## Rate Limiting
Applied to `/events` and `/diagnose` to prevent demo-time abuse (no auth layer in MVP, so this is the main abuse guard).
