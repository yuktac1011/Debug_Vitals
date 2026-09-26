# AgentDoctor — Database Schema

## Engine
PostgreSQL, accessed via SQLAlchemy (async) + asyncpg. Redis used alongside for ephemeral/live session state (not durable schema, see note at bottom).

## Tables

### `sessions`
Represents one project/demo session being diagnosed.
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| created_at | timestamp | |
| status | text | e.g. `active`, `diagnosed`, `verified`, `closed` |
| project_label | text | display name for the session (repo name or demo scenario name) |

### `events`
Every observed signal — agent action, git change, env/dependency change, test/CI result.
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| session_id | UUID (FK → sessions.id) | |
| event_type | text | `agent_action` \| `git_change` \| `env_change` \| `dependency_change` \| `test_result` \| `ci_result` |
| payload | JSONB | raw event detail, shape depends on event_type |
| timestamp | timestamp | used to order the timeline |

### `diagnoses`
A completed root-cause diagnosis run against a session's event set.
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| session_id | UUID (FK → sessions.id) | |
| root_cause | text | headline explanation |
| evidence | JSONB | list of evidence strings/refs to event ids |
| confidence | integer | 0–100 |
| affected_components | JSONB | list of component names |
| suggested_next_step | text | |
| created_at | timestamp | |

### `verifications`
A Failure Verification rerun tied to a diagnosis.
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| diagnosis_id | UUID (FK → diagnoses.id) | |
| hypothesis | text | e.g. "rerun under Node 22" |
| result | text | `passed` \| `failed` \| `error` |
| confidence_before | integer | |
| confidence_after | integer | |
| created_at | timestamp | |

### `regression_tests`
A Regression Guard–generated test tied to a confirmed diagnosis.
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| diagnosis_id | UUID (FK → diagnoses.id) | |
| test_code | text | generated test content |
| result | text | `passed` \| `failed` |
| created_at | timestamp | |

## Relationships
```
sessions 1---* events
sessions 1---* diagnoses
diagnoses 1---* verifications
diagnoses 1---* regression_tests
```

## Redis (non-durable, session-scoped)
- Live cumulative event cursor per session (for fast timeline reads before persistence catches up)
- In-progress verification/regression-guard job status (for WebSocket push without re-querying Postgres constantly)
- TTL-based, not treated as source of truth — PostgreSQL is authoritative
