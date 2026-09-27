# AgentDoctor Architecture

## 1. Problem
Developers often treat the symptom rather than the cause when fixing CI failures or bugs. Current tools are either too noisy (basic filesystem watchers) or too slow/expensive (sending the entire repo to an LLM on every save).

## 2. Architecture
AgentDoctor is a lightweight, local-first agentic analysis tool that sits silently in the developer's environment, bridging local file changes with intelligent diagnostic reasoning. It strictly separates filesystem tracking from AI reasoning to ensure speed, low cost, and zero hallucinations.

## 3. Data Flow
1. **File Change**: Developer saves a file.
2. **Watch Event**: `fs.watch` detects changes with a 500ms debounce.
3. **Change Intelligence**: Filters out noise (`node_modules`, `.git`, `.env`) and classifies remaining files.
4. **Context Builder**: Finds related files (e.g., tests) and strictly bounds the text to a 12,000 token limit.
5. **AI Analysis**: Requests an intelligent, structured diagnosis of the bounded context.
6. **Finding Engine**: Deduplicates, merges, and tracks the lifecycle (New → Open → Resolved) of discovered issues.
7. **Dashboard**: A Developer UI surfaces the risk summaries and detailed findings in real-time.

## 4. Environment Detection
Runs once at startup (`agentdoctor init`), safely scraping OS, Node/Python/Java versions, and package managers without touching secrets.

## 5. Change Intelligence
A filtering layer that aggressively drops temporary files, build outputs, and caches, saving thousands of API requests per session.

## 6. Context Optimization
Employs smart truncation and related-file discovery to provide the AI only what it needs, keeping payloads consistently under the token budget.

## 7. AI Analysis
A generic Provider interface that safely captures JSON output, validates strict enums (Severity, Category), and enforces an Evidence requirement for all findings.

## 8. Finding Engine
Uses SHA-256 fingerprinting to stabilize finding IDs across sessions. It tracks when an issue was `firstSeen` and naturally ages it to `resolved` if subsequent analyses of the same files no longer detect the problem.

## 9. Dashboard
A clean Next.js React interface serving as the primary developer hub. It reads locally persisted states (`.agentdoctor/findings.json`) via lightweight API routes.

## 10. 429/Token Protection
Requests are queued centrally. Max concurrency is set to 1. In-flight requests with identical context fingerprints are deduplicated. Max 2-attempt exponential backoff guarantees stability under provider strain.

## 11. Failure Handling
The CLI is fault-tolerant. Network timeouts, rate limits, and un-parseable LLM responses are caught and logged softly. The watcher *never* crashes, continuing to monitor the filesystem until the provider recovers.
