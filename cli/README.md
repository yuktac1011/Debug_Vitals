# debugvitals

> **Evidence-driven debugging and trust monitoring for AI-assisted software development.**

[![npm version](https://img.shields.io/npm/v/debugvitals)](https://www.npmjs.com/package/debugvitals)

Debug Vitals helps developers understand **why software failed** and **what an AI coding agent actually did before the failure**.

---

## Install

```bash
npm install -g debugvitals
```

---

## Quick Start

**Initialize** in your project root:

```bash
agentdoctor init
```

**Watch** your project for changes:

```bash
agentdoctor watch
```

**Capture an environment snapshot:**

```bash
agentdoctor snapshot create snapshot.json
```

**Capture a dependency snapshot:**

```bash
agentdoctor deps
```

**See all commands:**

```bash
agentdoctor --help
```

---

## What it does

Debug Vitals connects the full chain of evidence when something breaks:

```text
AI Agent Action
      ↓
Policy Decision (ALLOW / WARN / REQUIRE_APPROVAL / BLOCK)
      ↓
Code / Dependency / Environment Change
      ↓
CI Failure
      ↓
Cross-System Correlation
      ↓
Evidence-Based Root Cause
```

### Features

| Feature | Description |
|---|---|
| **Change Intelligence** | Monitors file changes with bounded context — no full repo scans |
| **Environment Snapshots** | Captures OS, runtime versions, package managers, git state |
| **Dependency Reproducibility** | Hashes lockfiles, tracks version drift over time |
| **Agent Activity Monitor** | Observes file writes, commands, and package installs |
| **Trust & Policy Engine** | Deterministic rules: ALLOW / WARN / REQUIRE_APPROVAL / BLOCK |
| **CI Failure Ingestion** | Normalizes GitHub Actions runs into structured data |
| **Root Cause Correlation** | Compares local vs CI environment, deps, and agent actions |

---

## Agent Integration

If you are writing a custom AI agent, hook it into the policy engine:

```javascript
const { AgentIntegration } = require('debugvitals/src/integration');

const integration = new AgentIntegration(process.cwd());
integration.start();

// Wrap actions — ALLOW continues, REQUIRE_APPROVAL pauses, BLOCK throws
await integration.onAction('FILE_WRITE', '.env', { command: 'echo KEY=val > .env' });
```

---

## Security

- Secrets and tokens are redacted before any storage or display
- Environment variable **values** are never stored — only presence is tracked
- CI logs are bounded in size
- Observation-only mode when pre-action interception is not available

---

## Dashboard

Pair with the Debug Vitals frontend dashboard for a visual investigation interface:

- Live agent activity timeline
- Policy decision approvals
- CI failure root cause view
- Dependency drift detection

---

## License

See [LICENSE](https://github.com/yuktac1011/Debug_Vitals/blob/main/LICENSE) for details.
