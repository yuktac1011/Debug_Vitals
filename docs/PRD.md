# AgentDoctor — Product Requirements Document (PRD)

## 1. Purpose
Define the scope, modules, and acceptance criteria for the AgentDoctor MVP built for the IBM hackathon.

## 2. Goals
- Reconstruct a causal timeline linking AI agent actions, code changes, environment/dependency state, tests, and CI results.
- Surface a ranked, evidence-backed root cause when a failure occurs, instead of a raw log dump.
- Let a developer verify a hypothesis (e.g. rerun under a different runtime) directly from the diagnosis.
- Optionally generate one targeted regression test that reproduces the diagnosed failure (Regression Guard).

## 3. Non-Goals (explicitly out of scope for MVP)
- User authentication / multi-tenant support (single global demo instance is fine)
- Full test-suite generation or general test automation (not a Selenium replacement)
- Voice/audio signal capture (not applicable to this product — text/structured-event only)
- Mobile app (see platform decision in PROJECT_CONTEXT.md)
- Production-grade trained ML model for correlation (rule-based + LLM reasoning is sufficient for MVP)

## 4. Core Modules & Requirements

### 4.1 Project Checkup
- Scans runtime version, installed dependencies, environment variables, connected services, and CI configuration.
- Flags inconsistencies (e.g. declared Node version vs. CI runner version) before a failure occurs.
- **Acceptance:** given a sample repo with a known mismatch, the checkup surfaces it without the developer manually diffing config files.

### 4.2 Failure Diagnosis
- Converts a raw failure event into: root cause, supporting evidence, affected components, confidence level, suggested next investigation step.
- **Acceptance:** given a scripted failure scenario (agent changes `package.json`, CI runs on old Node), the system outputs a correct root cause with evidence, not just the failing test name.

### 4.3 Agent Timeline
- Chronological view: agent action → file change → command → test → result.
- Each entry is timestamped and linked to the diagnosis when relevant.
- **Acceptance:** timeline renders in correct order for a multi-step scripted scenario and highlights the event(s) implicated in the diagnosis.

### 4.4 Dependency & Environment Map
- Visualizes relationships (e.g. Node version → package version → service → test) and highlights where current state diverges from expected state.
- **Acceptance:** map correctly flags the divergent node in the scripted scenario.

### 4.5 Failure Verification
- Tests a diagnosed hypothesis directly — e.g. reruns the failing test/build under a different environment variant in an isolated container.
- Strengthens or weakens the original confidence score based on the result.
- **Acceptance:** verification run changes the displayed confidence level after execution completes.

### 4.6 Regression Guard (scoped)
- Once a root cause is confirmed, auto-generates and runs **one** targeted test that reproduces the diagnosed failure.
- Explicitly **not** a general test-generation feature — it only closes the exact gap just diagnosed.
- **Acceptance:** a one-click action from a completed diagnosis produces a runnable test tied to that specific failure, with a pass/fail result shown.

## 5. User Flow (primary path)
1. Developer connects/points AgentDoctor at a repo + CI pipeline (or loads a demo scenario for the hackathon).
2. A failure occurs (or is triggered via a preset demo scenario).
3. AgentDoctor observes signals → builds timeline → correlates events → diagnoses root cause.
4. Developer views the diagnosis report (root cause, evidence, confidence, affected components).
5. Developer optionally triggers Failure Verification to confirm the hypothesis.
6. Developer optionally triggers Regression Guard to generate a test that locks in the fix.

## 6. Success Metrics (for the pitch, illustrative)
- Time-to-root-cause reduced vs. manual log/diff investigation.
- % of scripted failure scenarios correctly diagnosed with evidence.
- Confidence delta shown after Failure Verification (proves the verification step adds real signal, not just decoration).

## 7. Risks
- Live demo depends on deployed backend uptime — see DEPLOYMENT notes in ARCHITECTURE.md for mitigation (health checks, warm-keeping).
- Over-scoping Regression Guard into a full test-automation pitch dilutes the core "diagnosis" positioning — keep it scoped per PROJECT_CONTEXT.md.
