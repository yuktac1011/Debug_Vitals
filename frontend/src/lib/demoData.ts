/**
 * Shared mock data for the three demo scenarios.
 * All pages pull from here so the data is internally consistent.
 */

export type ScenarioId =
  | "node-runtime-mismatch"
  | "dependency-conflict"
  | "env-var-missing";

export interface DemoScenario {
  id: ScenarioId;
  label: string;
  shortDescription: string;
  /** What the CI failure message says */
  failureTitle: string;
  rootCause: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  causalChain: {
    id: string;
    marker: string;
    kind: string;
    label: string;
    detail?: string;
    state?: "failure" | "warning" | "success" | "normal";
  }[];
  evidence: {
    id: string;
    index: number;
    source: string;
    timestamp: string;
    value: string;
    note: string;
    timelineEventId: string;
  }[];
  affectedComponents: string[];
  suggestedNextStep: string;
  timeline: {
    id: string;
    time: string;
    kind: string;
    marker: string;
    description: string;
    detail?: string;
    relevant?: boolean;
  }[];
  environment: {
    runtime: { label: string; actual: string; expected: string; ok: boolean };
    dependencies: { name: string; actual: string; expected: string; ok: boolean }[];
    services: { name: string; status: "up" | "down" | "unknown" }[];
    ci: { name: string; status: "passing" | "failing" | "running" };
  };
  verification: {
    hypothesis: string;
    control: { label: string; result: string; failures: number };
    experiment: { label: string; result: string; failures: number };
    confidenceBefore: "LOW" | "MEDIUM" | "HIGH";
    confidenceAfter: "LOW" | "MEDIUM" | "HIGH";
  };
}

export const DEMO_SCENARIOS: Record<ScenarioId, DemoScenario> = {
  "node-runtime-mismatch": {
    id: "node-runtime-mismatch",
    label: "Node Runtime Mismatch",
    shortDescription:
      "Agent updates project to require Node ≥22. CI runner is on Node 20. Build succeeds locally, fails in CI.",
    failureTitle: "CI build failed — 17 test failures",
    rootCause:
      "The CI runner is using Node 20, but the agent changed the project requirement to Node 22.",
    confidence: "HIGH",
    causalChain: [
      {
        id: "c1",
        marker: "●",
        kind: "AGENT ACTION",
        label: 'Changed package.json → "node": ">=22"',
        detail: "14:31:42",
        state: "warning",
      },
      {
        id: "c2",
        marker: "◇",
        kind: "ENVIRONMENT MISMATCH",
        label: "CI runner uses Node 20.11.1",
        detail: "Expected ≥22",
        state: "failure",
      },
      {
        id: "c3",
        marker: "×",
        kind: "TEST FAILURE",
        label: "17 failures",
        detail: "checkout.integration.test · auth.service.test",
        state: "failure",
      },
      {
        id: "c4",
        marker: "×",
        kind: "CI FAILURE",
        label: "Build #1842 failed",
        detail: "14:32:09",
        state: "failure",
      },
    ],
    evidence: [
      {
        id: "e1",
        index: 1,
        source: "package.json",
        timestamp: "14:31:42",
        value: '"node": ">=22"',
        note: "Changed by agent",
        timelineEventId: "t1",
      },
      {
        id: "e2",
        index: 2,
        source: "CI environment",
        timestamp: "14:31:59",
        value: "Node.js 20.11.1",
        note: "Expected: >=22",
        timelineEventId: "t3",
      },
      {
        id: "e3",
        index: 3,
        source: "Test result",
        timestamp: "14:32:08",
        value: "checkout.integration.test — 17 failures",
        note: "Syntax: optional chaining not supported in Node 20",
        timelineEventId: "t4",
      },
    ],
    affectedComponents: ["CI runner", "package.json", "checkout.integration.test"],
    suggestedNextStep:
      "Pin the CI node image to node:22-alpine, or add an .nvmrc file and update the workflow to read from it.",
    timeline: [
      {
        id: "t1",
        time: "14:31:42",
        kind: "AGENT ACTION",
        marker: "●",
        description: 'Changed package.json engines.node to ">=22"',
        detail: '- "node": ">=20"\n+ "node": ">=22"',
        relevant: true,
      },
      {
        id: "t2",
        time: "14:31:51",
        kind: "TEST",
        marker: "✓",
        description: "Local test run — 124 passed",
        detail: "Ran under Node 22.3.0 (local)",
      },
      {
        id: "t3",
        time: "14:31:59",
        kind: "ENVIRONMENT",
        marker: "◇",
        description: "CI started — Node 20.11.1 detected",
        relevant: true,
      },
      {
        id: "t4",
        time: "14:32:08",
        kind: "TEST",
        marker: "×",
        description: "CI test run — 17 failed",
        detail:
          "FAIL checkout.integration.test\n  SyntaxError: Unexpected token (?)\nFAIL auth.service.test\n  SyntaxError: Unexpected token (?)",
        relevant: true,
      },
      {
        id: "t5",
        time: "14:32:09",
        kind: "CI",
        marker: "×",
        description: "Build #1842 failed",
        relevant: true,
      },
    ],
    environment: {
      runtime: {
        label: "Node.js",
        actual: "20.11.1",
        expected: "≥22",
        ok: false,
      },
      dependencies: [
        { name: "react", actual: "19.2.8", expected: "^19", ok: true },
        { name: "next", actual: "16.3.6", expected: "^16", ok: true },
      ],
      services: [
        { name: "PostgreSQL", status: "up" },
        { name: "Redis", status: "up" },
      ],
      ci: { name: "GitHub Actions", status: "failing" },
    },
    verification: {
      hypothesis: "CI fails because it uses Node 20. Rerunning under Node 22 should pass.",
      control: { label: "Node 20.11.1", result: "17 failures", failures: 17 },
      experiment: { label: "Node 22.3.0", result: "124 passed, 0 failures", failures: 0 },
      confidenceBefore: "MEDIUM",
      confidenceAfter: "HIGH",
    },
  },

  "dependency-conflict": {
    id: "dependency-conflict",
    label: "Dependency Conflict",
    shortDescription:
      "A patch release of a transitive dependency changes a default export. Agent auto-installs it; build succeeds but runtime crashes.",
    failureTitle: "Runtime crash — TypeError on import",
    rootCause:
      "axios@1.7.3 changed its default export shape. Agent installed it automatically; existing code expects the old shape.",
    confidence: "HIGH",
    causalChain: [
      {
        id: "c1",
        marker: "●",
        kind: "AGENT ACTION",
        label: "npm install axios@latest",
        detail: "15:04:11",
        state: "warning",
      },
      {
        id: "c2",
        marker: "◇",
        kind: "DEPENDENCY CHANGE",
        label: "axios 1.7.2 → 1.7.3",
        detail: "Patch release, breaking default export",
        state: "failure",
      },
      {
        id: "c3",
        marker: "×",
        kind: "RUNTIME CRASH",
        label: "TypeError: axios.create is not a function",
        detail: "api/client.ts line 8",
        state: "failure",
      },
      {
        id: "c4",
        marker: "×",
        kind: "CI FAILURE",
        label: "Build #1849 failed",
        detail: "15:05:02",
        state: "failure",
      },
    ],
    evidence: [
      {
        id: "e1",
        index: 1,
        source: "package-lock.json",
        timestamp: "15:04:11",
        value: "axios: 1.7.2 → 1.7.3",
        note: "Changed by agent npm install",
        timelineEventId: "t1",
      },
      {
        id: "e2",
        index: 2,
        source: "axios CHANGELOG",
        timestamp: "15:04:30",
        value: "v1.7.3: default export removed, named export only",
        note: "Breaking change in patch release",
        timelineEventId: "t2",
      },
      {
        id: "e3",
        index: 3,
        source: "api/client.ts",
        timestamp: "15:04:55",
        value: "TypeError: axios.create is not a function",
        note: "Line 8 — uses old default export",
        timelineEventId: "t3",
      },
    ],
    affectedComponents: ["api/client.ts", "axios@1.7.3", "All API-dependent tests"],
    suggestedNextStep:
      "Pin axios to 1.7.2 in package.json, or migrate api/client.ts to use the named import: import { create } from 'axios'.",
    timeline: [
      {
        id: "t1",
        time: "15:04:11",
        kind: "AGENT ACTION",
        marker: "●",
        description: "npm install axios@latest → installed 1.7.3",
        detail: "Previous: 1.7.2",
        relevant: true,
      },
      {
        id: "t2",
        time: "15:04:30",
        kind: "ENVIRONMENT",
        marker: "◇",
        description: "Dependency graph updated — axios 1.7.3",
        relevant: true,
      },
      {
        id: "t3",
        time: "15:04:55",
        kind: "TEST",
        marker: "×",
        description: "Runtime crash — TypeError in api/client.ts",
        detail: "TypeError: axios.create is not a function\n  at api/client.ts:8:14",
        relevant: true,
      },
      {
        id: "t4",
        time: "15:04:58",
        kind: "TEST",
        marker: "×",
        description: "CI test run — 41 failed (all API tests)",
      },
      {
        id: "t5",
        time: "15:05:02",
        kind: "CI",
        marker: "×",
        description: "Build #1849 failed",
        relevant: true,
      },
    ],
    environment: {
      runtime: { label: "Node.js", actual: "20.11.1", expected: ">=18", ok: true },
      dependencies: [
        { name: "axios", actual: "1.7.3", expected: "^1.7.2", ok: false },
        { name: "react", actual: "19.2.8", expected: "^19", ok: true },
      ],
      services: [{ name: "API mock", status: "up" }],
      ci: { name: "GitHub Actions", status: "failing" },
    },
    verification: {
      hypothesis: "Downgrading axios to 1.7.2 will fix the runtime crash.",
      control: { label: "axios@1.7.3", result: "41 failures", failures: 41 },
      experiment: { label: "axios@1.7.2", result: "124 passed, 0 failures", failures: 0 },
      confidenceBefore: "MEDIUM",
      confidenceAfter: "HIGH",
    },
  },

  "env-var-missing": {
    id: "env-var-missing",
    label: "Environment Variable Failure",
    shortDescription:
      "DATABASE_URL is set locally but missing in CI. Integration tests silently time out instead of erroring clearly.",
    failureTitle: "CI integration tests timed out",
    rootCause:
      "DATABASE_URL is present in the local environment but not in the CI secret store. Three integration tests time out waiting for a connection.",
    confidence: "HIGH",
    causalChain: [
      {
        id: "c1",
        marker: "◇",
        kind: "ENVIRONMENT",
        label: "DATABASE_URL not set in CI",
        detail: "Present locally, absent in GitHub Actions",
        state: "failure",
      },
      {
        id: "c2",
        marker: "→",
        kind: "COMMAND",
        label: "DB connection attempt — timeout after 30s",
        detail: "15:11:33",
        state: "warning",
      },
      {
        id: "c3",
        marker: "×",
        kind: "TEST FAILURE",
        label: "3 integration tests timed out",
        detail: "user.integration.test · order.integration.test",
        state: "failure",
      },
      {
        id: "c4",
        marker: "×",
        kind: "CI FAILURE",
        label: "Build #1853 failed",
        detail: "15:12:04",
        state: "failure",
      },
    ],
    evidence: [
      {
        id: "e1",
        index: 1,
        source: "CI environment secrets",
        timestamp: "15:11:15",
        value: "DATABASE_URL — not set",
        note: "Set in local .env, not in GitHub Actions secrets",
        timelineEventId: "t1",
      },
      {
        id: "e2",
        index: 2,
        source: "CI log",
        timestamp: "15:11:33",
        value: "Error: connect ECONNREFUSED 127.0.0.1:5432",
        note: "Database connection refused — no server reachable",
        timelineEventId: "t2",
      },
      {
        id: "e3",
        index: 3,
        source: "Test result",
        timestamp: "15:12:03",
        value: "user.integration.test — Timeout (30000ms)",
        note: "Silent timeout, no clear error surface to developer",
        timelineEventId: "t3",
      },
    ],
    affectedComponents: [
      "CI secrets store",
      "user.integration.test",
      "order.integration.test",
    ],
    suggestedNextStep:
      "Add DATABASE_URL to GitHub Actions secrets (Settings → Secrets), or add a service container for PostgreSQL in the CI workflow yml.",
    timeline: [
      {
        id: "t1",
        time: "15:11:15",
        kind: "ENVIRONMENT",
        marker: "◇",
        description: "CI started — DATABASE_URL not found in environment",
        relevant: true,
      },
      {
        id: "t2",
        time: "15:11:33",
        kind: "COMMAND",
        marker: "→",
        description: "DB connection attempt — ECONNREFUSED",
        detail: "Error: connect ECONNREFUSED 127.0.0.1:5432",
        relevant: true,
      },
      {
        id: "t3",
        time: "15:12:03",
        kind: "TEST",
        marker: "×",
        description: "user.integration.test — Timeout 30000ms",
        relevant: true,
      },
      {
        id: "t4",
        time: "15:12:03",
        kind: "TEST",
        marker: "×",
        description: "order.integration.test — Timeout 30000ms",
        relevant: true,
      },
      {
        id: "t5",
        time: "15:12:04",
        kind: "CI",
        marker: "×",
        description: "Build #1853 failed",
        relevant: true,
      },
    ],
    environment: {
      runtime: { label: "Node.js", actual: "20.11.1", expected: ">=18", ok: true },
      dependencies: [
        { name: "pg", actual: "8.12.0", expected: "^8", ok: true },
        { name: "prisma", actual: "5.18.0", expected: "^5", ok: true },
      ],
      services: [
        { name: "PostgreSQL", status: "down" },
        { name: "Redis", status: "up" },
      ],
      ci: { name: "GitHub Actions", status: "failing" },
    },
    verification: {
      hypothesis: "Setting DATABASE_URL in CI will allow integration tests to connect and pass.",
      control: { label: "Without DATABASE_URL", result: "3 timeouts", failures: 3 },
      experiment: {
        label: "With DATABASE_URL + pg service",
        result: "124 passed, 0 failures",
        failures: 0,
      },
      confidenceBefore: "MEDIUM",
      confidenceAfter: "HIGH",
    },
  },
};

export const DEFAULT_SCENARIO_ID: ScenarioId = "node-runtime-mismatch";
