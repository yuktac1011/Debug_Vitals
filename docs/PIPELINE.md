# AgentDoctor — Diagnostic Pipeline

## Purpose
Describes the end-to-end processing pipeline from raw signal capture to a delivered root-cause diagnosis, and the optional verification/regression-guard extensions.

## Pipeline Stages

### Stage 1 — Observe
Signals are captured continuously and written to the `events` table as they occur:
- Agent activity (file edits, installs, commands run, retries)
- Git changes (diffs, commit metadata)
- Environment state (runtime version, env vars, connected services)
- Dependency state (package manifests, version changes)
- Test results
- CI results

No correlation or judgment happens at this stage — it's pure capture.

### Stage 2 — Build the Timeline
Events for a session are ordered chronologically. This produces a readable sequence such as:
```
10:31  Agent modifies package.json
10:32  Dependency updated
10:33  Unit tests pass
10:34  Integration test fails
10:35  Agent modifies database configuration
10:36  CI fails
```
This stage is purely ordering — it does not yet infer causation.

### Stage 3 — Correlate
The Correlation Engine (graph-based, NetworkX) links events across categories instead of treating each as isolated:
```
CHANGE → ENVIRONMENT → DEPENDENCY → TEST → FAILURE
```
Edges are formed when events share affected components, timing proximity, or known dependency relationships (e.g. a package.json change is linked to the runtime-version node it declares).

### Stage 4 — Diagnose
The Root Cause Ranker scores candidate causes based on the correlation graph's structure and edge strength, e.g.:
```
Dependency mismatch      82%
Environment mismatch     13%
Test instability          5%
```
Percentages are derived from available evidence weighting, not arbitrary. The Reasoning Engine (LLM-assisted) then converts the top-ranked cause and its supporting graph path into a plain-language explanation:
> "The failure began after the agent upgraded library-X from 4.2 to 5.0. CI uses an older runtime that is incompatible with the new version. The same test passed before the dependency change."

### Stage 5 — Explain
The diagnosis (root cause, evidence, confidence, affected components, suggested next step) is persisted to the `diagnoses` table and pushed to the frontend via WebSocket.

## Optional Extension A — Failure Verification
Given a diagnosis, the developer can trigger a direct test of the hypothesis:
1. Backend spins up an isolated Docker container with the modified condition (e.g. different runtime version).
2. The originally failing test/build is rerun inside it.
3. Result (`passed` / `failed` / `error`) is recorded, and the diagnosis confidence is adjusted up or down accordingly.

This turns the diagnosis from "our best guess" into something empirically checked, not just asserted.

## Optional Extension B — Regression Guard
Given a **confirmed** diagnosis (post-verification or high-confidence), the developer can trigger:
1. Generation of one targeted test that specifically reproduces the diagnosed failure condition.
2. Immediate execution of that test.
3. Result stored in `regression_tests`, tied to the diagnosis it closes.

This is intentionally scoped to *one* test addressing the *exact* diagnosed gap — not general test-suite generation (see PRD.md non-goals and PROJECT_CONTEXT.md positioning notes).

## Failure Modes & Fallbacks
- If the Reasoning Engine's LLM call fails or times out, fall back to a template-based explanation built directly from the ranked evidence list — never leave the developer with no explanation.
- If Failure Verification's container run errors out (not fails — errors), the diagnosis confidence is left unchanged and the error is surfaced explicitly, not silently treated as a "fail" result.
- If Regression Guard's generated test itself fails to compile/run, surface that as a distinct state ("test generation needs review") rather than misreporting it as a regression failure.
