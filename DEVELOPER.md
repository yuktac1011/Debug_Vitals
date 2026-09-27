# Debug Vitals - Developer Guidelines

Welcome to **Debug Vitals**! This tool is an end-to-end diagnostic and observability system built to monitor, debug, and safely integrate AI coding agents with your local development and CI pipelines.

## What It Does

Debug Vitals provides:
1. **Change Intelligence**: Monitors your file system deterministically to gather a compact context of what changed (without scanning your entire repo).
2. **Environment & Dependency Snapshots**: Captures your local OS, runtime versions, package managers, and lockfile hashes to detect drift when CI fails.
3. **Agent Activity Monitor**: Observes agent activities (file writes, commands) and scrubs secrets/passwords before persistence.
4. **Trust & Permission Engine**: Acts as a rule-based policy engine to intercept and require manual approval for risky agent actions (like destructive commands or modifying `.env`).
5. **Cross-System Correlation**: Unifies all of the above (agent actions, file changes, dependency state drift, environment mismatches) to confidently explain *why* a CI build or local run failed.

## How to Use It

Debug Vitals operates across three layers: the CLI, the Backend, and the Frontend Dashboard.

### 1. The CLI (Data Collection & Observation)

The CLI acts as the intelligence and observation engine. It runs locally in your project.

- **Start the Watcher**: 
  ```bash
  agentdoctor watch
  ```
  This monitors file changes, builds bounded context, and dispatches them to the AI engine for analysis.

- **Take an Environment Snapshot**:
  ```bash
  agentdoctor snapshot
  ```
  Records your current OS, architecture, and runtime versions to `.agentdoctor/environment.json`.

- **Take a Dependency Snapshot**:
  ```bash
  agentdoctor deps
  ```
  Hashes your lockfiles and records your resolved dependencies to `.agentdoctor/dependency_history.json`.

#### Agent Integration Hook
If you are writing a custom AI agent, integrate it via our adapter to respect security policies:
```javascript
const { AgentIntegration } = require('./cli/src/integration');
const integration = new AgentIntegration(process.cwd());
integration.start();

// Wrap agent actions to enforce ALLOW / WARN / REQUIRE_APPROVAL / BLOCK
await integration.onAction('COMMAND_EXECUTED', 'npm install', { command: 'npm install' });
```

### 2. The Backend API

The backend serves as a persistence and query layer. It does not perform any heavy logic or ML, keeping it fast and safe.

- **Interactive API Documentation**: Explore and test the API endpoints using the auto-generated Swagger UI.
  - 👉 **[View API Docs](http://localhost:8000/docs)**

### 3. The Developer Dashboard

The frontend (Next.js) provides a beautiful, real-time visualization of your project's health, findings, agent activity, and incident correlation.

- **Access the Dashboard**: 
  - 👉 **[Open Debug Vitals Dashboard](http://localhost:3000)**

#### Dashboard Features:
- **Findings & Risks**: Review AI-detected code anomalies.
- **Agent Activity**: See a live, redacted timeline of what the agent is doing locally.
- **Trust / Permissions**: Approve or Reject pending agent actions that tripped a security policy.
- **Why Did This Happen?**: Click on a failed CI Run to see a correlated root-cause timeline showing exactly what changed leading up to the failure.
