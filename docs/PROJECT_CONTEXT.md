# AgentDoctor — Project Context

## Tagline
Diagnose the cause, not just the symptom.

## One-Line Pitch
AgentDoctor is a diagnostic layer for AI-assisted development that traces agent actions, code changes, environments, dependencies, tests, and CI failures to help developers understand what actually caused a failure.

## Shorter Pitch
AI can write the code. AgentDoctor helps you understand what broke.

## Problem
AI coding agents can now modify multiple files, install dependencies, execute commands, run tests, and autonomously retry when something fails. When something breaks, developers can no longer quickly determine what caused the failure, because the cause could be:

- an AI-generated code change
- a dependency or version mismatch
- environment configuration
- missing services or environment variables
- CI/CD infrastructure
- a flaky test
- an external tool or API
- an action performed by the AI agent itself

Developers are forced to manually reconstruct what happened by jumping between Git diffs, terminal logs, CI logs, dependency files, environment configuration, test results, and agent activity. This gets significantly harder as agents make more autonomous changes before a failure surfaces.

## Core Insight
Current developer tools show **symptoms** (a failed test, a red CI badge), not the **causal chain** that produced them. Git shows *what* changed. CI shows *what* failed. Logs show raw events. None of these connect agent action → environment/dependency shift → test failure → CI failure into one understandable story.

## Target Users
Developers working with:
- AI coding agents
- Large existing codebases
- CI/CD pipelines
- Multiple dependencies
- Docker/containerized environments
- Microservices
- External APIs
- Cloud development environments

Especially relevant to teams where agents can autonomously make multiple changes rather than generating a single small snippet.

## What AgentDoctor Is Not
- Not another log viewer
- Not another CI dashboard
- Not another AI code reviewer
- Not a chatbot that says "try reinstalling dependencies"
- Not a full test-generation/automation platform (see Regression Guard scoping in PRD)

## Platform Decision
**Web only.** Every core feature (timelines, dependency graphs, diagnosis reports, verification reruns) is a desktop-screen, dev-environment-adjacent workflow. No feature has a legitimate mobile-first use case; a mobile app would be padding, not function. The only mobile-adjacent touchpoint is optional push/Slack-style notifications when a diagnosis completes — implemented as a notification integration, not a separate app.

## Why This Problem Matters Now
Traditional developer workflows assumed the developer was the primary actor making changes. AI agents break that assumption — the number of actions between "developer asks for something" and "developer sees the result" keeps growing. Developers now need observability into the *development process itself*, not just the running application. AgentDoctor addresses that gap.
