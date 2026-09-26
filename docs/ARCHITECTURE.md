# AgentDoctor — System Architecture

## Overview
AgentDoctor is organized into four tiers, each handling one stage of the diagnostic pipeline:

1. **Observation Tier** — captures raw signals (agent actions, Git changes, environment, dependencies, CI/test results).
2. **Correlation Tier** — links observed events into a causal graph/timeline.
3. **Diagnosis Tier** — ranks likely root causes by evidence and generates a human-readable explanation.
4. **Interface Tier** — surfaces the timeline, diagnosis, verification, and regression-guard actions to the developer.

## Tier Breakdown

### 1. Observation Tier
- **Agent Activity Capture** — hooks/wrapper around agent tool-calls (file edits, installs, commands executed).
- **Git Change Watcher** — parses diffs, commit metadata.
- **Environment & Dependency Scanner** — reads runtime version, package manifests, env vars, connected services.
- **CI/Test Result Listener** — ingests CI run results and test outcomes (GitHub Actions API or equivalent).

### 2. Correlation Tier
- **Timeline Builder** — orders all captured events chronologically per project/session.
- **Correlation Engine** — graph-based linking (NetworkX) connecting change → environment → dependency → test → failure, rather than treating each event as isolated.

### 3. Diagnosis Tier
- **Root Cause Ranker** — rule-based scoring across candidate causes (dependency mismatch, environment mismatch, test instability, etc.), weighted by evidence strength.
- **Reasoning Engine** — LLM-assisted explanation generation, converting the ranked evidence into a plain-language diagnosis.
- **Failure Verification Runner** — spins up an isolated container (Docker) to test a hypothesis directly (e.g. rerun under a different Node version) and updates confidence based on the result.
- **Regression Guard** — generates and runs one targeted test reproducing the confirmed failure.

### 4. Interface Tier
- **Diagnosis Dashboard** — root cause, evidence, confidence, affected components, next steps.
- **Agent Timeline View** — chronological event view with the implicated event(s) highlighted.
- **Dependency & Environment Map View** — visual graph of the current vs. expected state.
- **Real-Time Push** — WebSocket updates as diagnosis/verification progress, no polling.

## Data Flow (happy path)
```
Agent action / code change
        ↓
Observation Tier captures event
        ↓
Correlation Tier links it into the running timeline/graph
        ↓
Failure detected (CI/test)
        ↓
Diagnosis Tier ranks causes + generates explanation
        ↓
Interface Tier renders diagnosis report
        ↓
(optional) Failure Verification reruns hypothesis in isolated container
        ↓
(optional) Regression Guard generates + runs targeted test
```

## Deployment
- **Frontend:** Vercel
- **Backend:** Render (FastAPI + Redis + PostgreSQL)
- **Verification containers:** Docker, spun up on-demand by the backend for isolated reruns
- **CORS:** locked to the deployed frontend domain only, not wildcarded
- **Reliability for live demo/deploy-link judging:**
  - `/health` endpoint for uptime confirmation
  - Keep-warm ping (e.g. every 5 min) to avoid free-tier cold starts during judging windows
  - Frontend shows an explicit "reconnecting" state rather than a blank screen on backend hiccup

## Explicit Non-Goals in Architecture
- No multi-tenant auth layer in MVP
- No trained ML model for correlation in MVP (rule-based + LLM reasoning only)
- No mobile client (see PROJECT_CONTEXT.md platform decision)
