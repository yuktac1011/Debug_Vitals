# Debug Vitals

> **Evidence-driven debugging and trust monitoring for AI-assisted software development.**

Debug Vitals helps developers understand **why software failed** and **what an AI coding agent actually did before the failure**.

It combines environment detection, dependency reproducibility, CI failure analysis, agent activity monitoring, policy decisions, and cross-system correlation into one investigation trail.

---

## Why Debug Vitals?

Modern AI coding agents can:

* modify source code
* change dependencies
* run commands
* access files
* interact with databases and cloud services
* trigger CI failures

When something breaks, the error message alone often does not explain the complete story.

Debug Vitals connects the evidence:

```text
AI Agent
   ↓
Agent Action
   ↓
Policy Decision
   ↓
Code / Dependency / Environment Change
   ↓
CI
   ↓
Failure
   ↓
Correlation
   ↓
Root Cause
```

---

## Features

### 🔍 Environment Detection

Detects project and development environment information including:

* Project type
* Runtime versions
* Package managers
* Frameworks
* Build/test scripts
* Git information
* Development tools

### 📦 Dependency Reproducibility

Tracks dependency state and detects:

* Version differences
* Lockfile changes
* Missing lockfiles
* Manifest/lockfile drift
* Package-manager mismatches
* Historical dependency changes

### 🤖 AI Agent Activity

Observes supported agent activity such as:

* File reads
* File writes
* File deletion
* Command execution
* Package installation/removal
* Database operations
* Network requests
* Cloud actions

### 🛡️ Trust & Policy

Actions can be evaluated using deterministic policies:

```text
ALLOW
WARN
REQUIRE_APPROVAL
BLOCK
```

Examples include credential access, destructive commands, database writes, and cloud actions.

### 🚨 CI Failure Analysis

Ingests CI information and normalizes:

* CI runs
* Jobs
* Failures
* Relevant logs
* Commit information

### 🔗 Cross-System Correlation

Connects related events:

```text
Agent Action
     ↓
Code Change
     ↓
Dependency Change
     ↓
CI Run
     ↓
CI Failure
```

### 🧠 Root-Cause Analysis

Compares available evidence from:

* Local environment
* CI environment
* Dependencies
* Historical snapshots
* Recent changes
* Agent activity
* CI failures

The system distinguishes between:

* **Observed**
* **Likely**
* **Unknown**

It does not claim a root cause without supporting evidence.

---

# Installation

```bash
npm install debugvitals
```

> Replace `debugvitals` with the final published npm package name if different.

---

# Quick Start

Initialize Debug Vitals in your project:

```bash
npx debugvitals init
```

Run an environment scan:

```bash
npx debugvitals env
```

Start monitoring:

```bash
npx debugvitals watch
```

The CLI observes relevant project changes and produces structured events for analysis.

---

# Typical Workflow

### 1. Start Debug Vitals

```bash
npx debugvitals watch
```

### 2. Your AI agent makes a change

For example:

```text
package.json
```

is modified.

Debug Vitals records the relevant change.

### 3. The action is evaluated

Example:

```text
PACKAGE_INSTALL
→ REQUIRE_APPROVAL
```

### 4. CI fails

Debug Vitals receives the CI failure.

### 5. Evidence is correlated

The system compares:

```text
Agent activity
+
Code changes
+
Dependencies
+
Environment
+
CI failure
```

### 6. Investigation result

The dashboard presents the available evidence and relationship between events.

---

# CLI

Common commands:

```bash
npx debugvitals init
npx debugvitals env
npx debugvitals watch
```

Additional commands may be available depending on the installed version.

Run:

```bash
npx debugvitals --help
```

to see the commands supported by your installed release.

---

# Configuration

Debug Vitals supports configuration through environment variables and project configuration.

Create a local environment file when required:

```bash
cp .env.example .env
```

Never commit secrets.

Example:

```env
DEBUG_VITALS_AI_PROVIDER=...
DEBUG_VITALS_AI_MODEL=...
DEBUG_VITALS_API_URL=...
```

Only configure values required by the features you use.

---

# Security & Privacy

Debug Vitals is designed to avoid exposing sensitive information unnecessarily.

The system:

* Redacts detected secrets
* Does not store environment variable values
* Uses environment metadata rather than raw secret values
* Bounds CI log ingestion
* Avoids unrestricted source-code collection
* Avoids logging raw AI prompts/responses
* Uses deterministic policy decisions for trust controls

Always review your configuration before sending data to external AI providers or CI systems.

---

# Architecture

```text
┌───────────────────────┐
│      AI Agent         │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│   Debug Vitals CLI    │
│                       │
│ Environment           │
│ Changes                │
│ Dependencies           │
│ Agent Activity         │
│ Policies               │
│ Correlation            │
│ AI Analysis            │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│       Backend         │
│    API + Storage      │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│      Dashboard        │
│                       │
│ Findings              │
│ CI                    │
│ Environment           │
│ Dependencies          │
│ Agent Activity        │
│ Correlation            │
└───────────────────────┘
```

The CLI contains the core observation and intelligence layer.

The backend provides API and persistence capabilities.

The frontend provides visualization and investigation workflows.

---

# Limitations

Debug Vitals does **not** claim universal interception of every AI agent.

Agent monitoring and enforcement depend on the integration points available in the environment.

Where pre-action interception is not technically available, the system operates in an observation-only mode rather than pretending that an action was blocked.

Root-cause conclusions are evidence-driven and may report insufficient evidence when the available data does not support a conclusion.

---

# Development

Clone the repository:

```bash
git clone <repository-url>
cd Debug_Vitals
```

Install dependencies:

```bash
npm install
```

The repository contains:

```text
cli/        # Core CLI and intelligence
backend/    # API and persistence
frontend/   # Dashboard
demo-project/
docs/
```

Run the relevant development commands from the project documentation.

---

# Demo

The recommended demonstration flow is:

```text
AI Agent Action
      ↓
Policy Decision
      ↓
Dependency / Code Change
      ↓
CI Failure
      ↓
Environment Comparison
      ↓
Cross-System Correlation
      ↓
Evidence-Based Root Cause
```

This demonstrates the central purpose of Debug Vitals:

> **Understand both what changed and why the resulting system failed.**

---

# License

See the repository license for details.
