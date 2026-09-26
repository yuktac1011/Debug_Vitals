# AgentDoctor — Documentation Index

Diagnose the cause, not just the symptom.

## Docs in this set

| File | Covers |
|---|---|
| [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) | Problem, pitch, target users, positioning, platform decision |
| [PRD.md](./PRD.md) | Scope, modules, acceptance criteria, non-goals, user flow |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Four-tier system design, data flow, deployment |
| [FRONTEND.md](./FRONTEND.md) | Pages, views, real-time behavior, design notes |
| [BACKEND.md](./BACKEND.md) | Services, endpoints, workers, reliability notes |
| [DATABASE.md](./DATABASE.md) | Schema, tables, relationships |
| [API.md](./API.md) | Full endpoint reference with request/response examples |
| [PIPELINE.md](./PIPELINE.md) | Observe → Timeline → Correlate → Diagnose → Explain flow, plus Verification & Regression Guard |

## Quick Orientation
Start with **PROJECT_CONTEXT.md** for the "why," then **PRD.md** for the "what," then **ARCHITECTURE.md** + **PIPELINE.md** for the "how." **FRONTEND.md**, **BACKEND.md**, **DATABASE.md**, and **API.md** are implementation-level references for whoever is building each layer.

## Core Modules (at a glance)
1. Project Checkup — pre-failure consistency scan
2. Failure Diagnosis — root cause + evidence + confidence
3. Agent Timeline — chronological agent-action view
4. Dependency & Environment Map — relationship visualization
5. Failure Verification — hypothesis testing via isolated rerun
6. Regression Guard — one targeted test closing the diagnosed gap

## Platform
Web only. See PROJECT_CONTEXT.md for the reasoning.
