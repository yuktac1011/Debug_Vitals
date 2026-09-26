# AgentDoctor — Frontend

## Stack
- Next.js
- React
- Tailwind, shadcn, GSap CSS
- WebSocket client for real-time diagnosis/timeline updates

## Platform
Web only. No mobile app — see platform decision in PROJECT_CONTEXT.md.

## Pages / Views

### 1. Dashboard (landing view)
- Entry point on deploy link load.
- Clear CTA for judges/users: preset demo-scenario buttons to trigger a scripted failure without needing a real repo connected.
- Shows connection/health status of the backend.

### 2. Diagnosis Report View
- Root cause statement (headline).
- Evidence list (bulleted, sourced from correlation engine).
- Confidence level (visual indicator, not just a number).
- Affected components.
- Suggested next investigation step.
- Action buttons: "Run Verification", "Generate Regression Test".

### 3. Agent Timeline View
- Vertical or horizontal chronological feed: agent action → file change → command → test → result.
- The event(s) implicated in the current diagnosis are visually highlighted (color/border), not just listed identically to the rest.

### 4. Dependency & Environment Map View
- Node-graph visualization (e.g. force-directed) showing runtime → dependency → service → test relationships.
- Diverging/expected-vs-actual nodes visually distinguished (e.g. red border on the mismatched node).

### 5. Verification Panel
- Shows the hypothesis being tested (e.g. "rerun under Node 22").
- Live status while the isolated container run executes.
- Before/after confidence comparison once complete.

### 6. Regression Guard Panel
- Shown only after a diagnosis is confirmed.
- One-click "Generate test for this failure" action.
- Displays the generated test and its pass/fail result after running.

## Real-Time Behavior
- All views subscribe to the backend WebSocket channel for the active session/project ID.
- No polling — diagnosis, timeline, and verification updates push directly to the UI.
- On disconnect: show an explicit "reconnecting…" state, never a blank or frozen screen.

## Design Notes
- Dark theme, consistent with the rest of the pitch deck's visual language.
- Keep the diagnosis report as the emotional "payoff" screen — most visual weight, clearest hierarchy (headline root cause first, evidence second, actions last).
- Preset scenario buttons on the dashboard exist specifically so a judge landing on the live deploy link cold has an obvious, guided path — never make them guess what to click.
