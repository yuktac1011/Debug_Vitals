# AgentDoctor — Backend

## Stack
- FastAPI
- Python
- Uvicorn
- PostgreSQL (SQLAlchemy + asyncpg)
- Redis (Pub/Sub + state)
- Celery (async workers)
- Docker (isolated verification reruns)
- NetworkX (correlation graph)

## Responsibilities
1. Capture and store observed events (agent actions, Git changes, env/dependency state, CI/test results).
2. Build and maintain the correlation graph/timeline per project/session.
3. Run the root-cause ranking and reasoning generation on failure.
4. Execute Failure Verification reruns in isolated containers.
5. Generate and run Regression Guard tests.
6. Push real-time updates to connected frontend clients via WebSocket.

## Key Endpoints (indicative)

### `POST /events`
Ingests a single observed event (agent action, file change, command, test result, CI status).
```
{
  "session_id": str,
  "event_type": "agent_action" | "git_change" | "env_change" | "dependency_change" | "test_result" | "ci_result",
  "payload": {...},
  "timestamp": iso8601
}
```

### `GET /session/{id}/timeline`
Returns the ordered event timeline for a session, from PostgreSQL.

### `POST /session/{id}/diagnose`
Triggers diagnosis on the current event set. Runs correlation + ranking + reasoning.
Output:
```
{
  "root_cause": str,
  "evidence": [str],
  "confidence": int,
  "affected_components": [str],
  "suggested_next_step": str
}
```

### `POST /session/{id}/verify`
Triggers Failure Verification — reruns the failing test/build under a modified condition (e.g. different runtime) in an isolated Docker container.
Output includes updated confidence based on the rerun result.

### `POST /session/{id}/regression-guard`
Triggered only after a confirmed diagnosis. Generates one targeted test reproducing the diagnosed failure, runs it, returns pass/fail.

### `WebSocket /ws/{session_id}`
Streams live updates: new events, diagnosis completion, verification progress, regression-guard result.

### `GET /health`
Uptime check for deployment monitoring / keep-warm pings.

## Background Workers (Celery)
- Reasoning-summary generation (LLM call), kept async so the diagnose endpoint stays responsive.
- Verification container orchestration (spin up, run, tear down, report).
- Optional: risk/confidence recalculation on new incoming events.

## Data Persistence
See DATABASE.md for schema. Redis holds per-session live state (current timeline cursor, in-progress verification status); PostgreSQL holds the durable event/diagnosis history.

## Reliability Notes for Live Demo
- `/health` endpoint used by an external keep-warm ping (e.g. every 5 minutes) to avoid free-tier cold starts during judging.
- CORS restricted to the deployed frontend origin only.
- Rate limiting on `/events` and `/diagnose` to prevent demo-time abuse without needing full auth.
