// All demo data for Debug Vitals — three realistic scenarios
// Used when no live backend session is available

export type ScenarioId = "node-mismatch" | "dep-upgrade" | "auth-regression"

export interface TimelineEvent {
  id: string
  time: string
  kind: "AGENT" | "GIT" | "ENV" | "TEST" | "CI" | "DEP"
  title: string
  detail?: string
  status: "ok" | "warn" | "fail" | "info"
  relevant: boolean
}

export interface RootCause {
  rank: number
  score: number // 0-1
  reason: string
  eventId?: string
}

export interface CausalStep {
  id: string
  label: string
  sublabel: string
  kind: "agent" | "env" | "test" | "ci" | "dep" | "git"
  status: "ok" | "fail" | "warn"
}

export interface Evidence {
  id: string
  label: string
  file?: string
  value: string
  expected?: string
  actual?: string
  status: "ok" | "fail" | "warn"
}

export interface EnvDep {
  name: string
  version: string
  expected?: string
  ok: boolean
}

export interface Scenario {
  id: ScenarioId
  title: string
  description: string

  // Checkup
  runtime:      { label: string; version: string; ok: boolean; expected?: string }
  ciStatus:     "passing" | "failing" | "running"
  activeFailure: string
  testSummary:  { total: number; passed: number; failed: number }
  deps:         EnvDep[]
  services:     { name: string; status: "up" | "down" | "degraded" }[]

  // Diagnosis
  rootCause:    string
  confidence:   number // 0-100
  rootCauses:   RootCause[]
  causalChain:  CausalStep[]
  evidence:     Evidence[]
  affectedComponents: string[]
  nextStep:     string
  explanation:  string

  // Timeline
  timeline: TimelineEvent[]

  // Verification
  hypothesis:   string
  control:      { label: string; result: string; status: "fail" }
  experiment:   { label: string; result: string; status: "ok" | "running" }
  verified:     boolean

  // Regression
  regressionTest: string
}

// ── Scenario 1: Node 20/22 CI mismatch ────────────────────────────────────────
const nodeScenario: Scenario = {
  id: "node-mismatch",
  title: "Node 20/22 CI runtime mismatch",
  description: "17 CI failures traced to a Node version mismatch introduced by agent.",

  runtime:      { label: "Node.js", version: "22.0.0", ok: false, expected: "20.x (CI)" },
  ciStatus:     "failing",
  activeFailure: "CI failed: 17 integration tests",
  testSummary:  { total: 124, passed: 107, failed: 17 },
  deps: [
    { name: "react",          version: "18.3.1", ok: true },
    { name: "typescript",     version: "5.4.5",  ok: true },
    { name: "@types/node",    version: "22.0.0", ok: false, expected: "20.x" },
    { name: "vitest",         version: "1.6.0",  ok: true },
    { name: "esbuild",        version: "0.21.5", ok: false, expected: "0.20.x" },
  ],
  services: [
    { name: "PostgreSQL",     status: "up" },
    { name: "Redis",          status: "up" },
    { name: "GitHub Actions", status: "down" },
  ],

  rootCause: "CI is running Node 20, but the agent updated package.json to require Node 22.",
  confidence: 94,
  rootCauses: [
    { rank: 1, score: 0.94, reason: "package.json engines.node set to >=22 while CI image is node:20-alpine." },
    { rank: 2, score: 0.61, reason: "esbuild 0.21.5 dropped Node 18/20 support; build step fails on CI." },
    { rank: 3, score: 0.28, reason: "17 test files use Array.fromAsync() — available in Node 22, not 20." },
  ],
  causalChain: [
    { id: "c1", label: "Agent action",           sublabel: "Updated package.json engines.node to >=22", kind: "agent", status: "fail" },
    { id: "c2", label: "Environment mismatch",   sublabel: "CI node:20-alpine vs local node:22",        kind: "env",   status: "fail" },
    { id: "c3", label: "Build step failed",      sublabel: "esbuild 0.21.5 incompatible with Node 20",  kind: "dep",   status: "fail" },
    { id: "c4", label: "17 tests failed",        sublabel: "Array.fromAsync() not available on Node 20", kind: "test", status: "fail" },
    { id: "c5", label: "CI build failed",        sublabel: "GitHub Actions job: test — conclusion: failure", kind: "ci", status: "fail" },
  ],
  evidence: [
    { id: "e1", label: "package.json engines",  file: "package.json",          value: `"engines": { "node": ">=22" }`,           status: "fail" },
    { id: "e2", label: "CI image",              file: ".github/workflows/ci.yml", value: `image: node:20-alpine`,                status: "fail" },
    { id: "e3", label: "Failed tests",          file: "src/tests/api.test.ts", value: `Array.fromAsync is not a function`,       status: "fail" },
    { id: "e4", label: "Build error",           file: "dist/build.log",        value: `error: node 20.x is below the required version`, status: "fail" },
    { id: "e5", label: "Local runtime",         file: ".nvmrc",                value: `22.0.0`,                                 status: "ok" },
  ],
  affectedComponents: ["CI/CD pipeline", "Integration tests (17)", "Build step (esbuild)", "package.json"],
  nextStep: "Update .github/workflows/ci.yml to use node:22-alpine, or revert package.json engines.node to >=20.",
  explanation:
    "The agent modified package.json to require Node >=22 during a dependency audit. This silently broke the CI pipeline which was pinned to node:20-alpine. The build step (esbuild 0.21.5) fails on Node 20, causing all 17 integration tests to report as failures before they can even run.",

  timeline: [
    { id: "t1",  time: "14:28:01", kind: "AGENT", title: "Agent started dependency audit",             status: "info", relevant: false },
    { id: "t2",  time: "14:29:14", kind: "AGENT", title: "Updated 12 dependencies via npm",            status: "info", relevant: true,  detail: "npm install react@18.3.1 typescript@5.4.5 @types/node@22.0.0 esbuild@0.21.5" },
    { id: "t3",  time: "14:29:18", kind: "GIT",   title: "Committed package.json and package-lock.json", status: "info", relevant: true, detail: "commit abc1234: chore: update dependencies to latest\n  Modified: package.json, package-lock.json" },
    { id: "t4",  time: "14:29:20", kind: "ENV",   title: "Local: node 22.0.0 — all deps resolved",    status: "ok",  relevant: false },
    { id: "t5",  time: "14:30:02", kind: "TEST",  title: "Local tests — 124 passed, 0 failed",         status: "ok",  relevant: false, detail: "PASS src/tests/api.test.ts\nTest Suites: 18 passed\nTests: 124 passed, 0 failed" },
    { id: "t6",  time: "14:31:10", kind: "CI",    title: "CI triggered on push to main",               status: "info", relevant: true },
    { id: "t7",  time: "14:31:42", kind: "CI",    title: "CI: node:20-alpine image pulled",            status: "warn", relevant: true, detail: "node --version: v20.15.1\nnpm --version: 10.7.0" },
    { id: "t8",  time: "14:31:59", kind: "CI",    title: "CI build step failed (esbuild)",             status: "fail", relevant: true, detail: "error: node v20.15.1 is below the minimum required version v22.0.0 for esbuild@0.21.5" },
    { id: "t9",  time: "14:32:08", kind: "TEST",  title: "CI tests — 0 passed, 17 failed",             status: "fail", relevant: true, detail: "FAIL src/tests/api.test.ts\nTypeError: Array.fromAsync is not a function\n  at async buildTestData (src/tests/api.test.ts:14:3)" },
    { id: "t10", time: "14:32:09", kind: "CI",    title: "CI build failed — job: test",                status: "fail", relevant: true, detail: "Conclusion: failure\nDuration: 67s\nArtifacts: build.log" },
  ],

  hypothesis: "Updating the CI node image from node:20-alpine to node:22-alpine will resolve all 17 failures.",
  control:    { label: "CI node:20-alpine", result: "17 failed, build error",  status: "fail" },
  experiment: { label: "CI node:22-alpine", result: "124 passed, 0 failed",    status: "ok" },
  verified:   true,

  regressionTest: `// regression: ensure CI node version matches package.json engines requirement
// generated by Debug Vitals — do not edit manually

import { readFileSync } from "fs"
import { execSync } from "child_process"

test("CI node version satisfies package.json engines.node", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"))
  const required = pkg.engines?.node ?? ">=0"
  const ciNodeVersion = process.version // injected at test time
  const { satisfies } = require("semver")
  expect(satisfies(ciNodeVersion, required)).toBe(true)
})`,
}

// ── Scenario 2: Requests library breaking change ───────────────────────────────
const depUpgradeScenario: Scenario = {
  id: "dep-upgrade",
  title: "requests 2.28 → 2.31 breaking change",
  description: "5 API tests broken after agent upgraded requests library.",

  runtime:      { label: "Python", version: "3.11.6", ok: true },
  ciStatus:     "failing",
  activeFailure: "CI failed: 5 integration tests",
  testSummary:  { total: 40, passed: 35, failed: 5 },
  deps: [
    { name: "requests",  version: "2.31.0", ok: false, expected: "2.28.0" },
    { name: "fastapi",   version: "0.110.0", ok: true },
    { name: "httpx",     version: "0.27.0",  ok: true },
    { name: "pytest",    version: "7.4.0",   ok: true },
  ],
  services: [
    { name: "PostgreSQL", status: "up" },
    { name: "Redis",      status: "up" },
    { name: "GitHub CI",  status: "down" },
  ],

  rootCause: "requests 2.31.0 removed PreparedRequest from the top-level namespace, breaking 5 integration tests that import it directly.",
  confidence: 88,
  rootCauses: [
    { rank: 1, score: 0.88, reason: "requests 2.31.0 moved PreparedRequest — ImportError in test_api.py." },
    { rank: 2, score: 0.44, reason: "urllib3 2.x bundled with requests 2.31 has stricter SSL defaults." },
  ],
  causalChain: [
    { id: "c1", label: "Agent action",        sublabel: "pip install requests==2.31.0", kind: "agent", status: "fail" },
    { id: "c2", label: "Dependency change",   sublabel: "requests 2.28.0 → 2.31.0",    kind: "dep",   status: "fail" },
    { id: "c3", label: "Import error",        sublabel: "from requests import PreparedRequest", kind: "env", status: "fail" },
    { id: "c4", label: "5 tests failed",      sublabel: "ImportError in test_http_*.py", kind: "test", status: "fail" },
    { id: "c5", label: "CI build failed",     sublabel: "job: test — conclusion: failure", kind: "ci", status: "fail" },
  ],
  evidence: [
    { id: "e1", label: "requirements.txt",   file: "requirements.txt",       value: "requests==2.31.0",  status: "fail" },
    { id: "e2", label: "Import statement",   file: "tests/test_http_get.py", value: "from requests import PreparedRequest", status: "fail" },
    { id: "e3", label: "Changelog note",     file: "requests 2.31.0 CHANGELOG", value: "PreparedRequest moved to requests.models", status: "warn" },
    { id: "e4", label: "Passing with 2.28",  file: "(local rollback test)",  value: "5/5 tests pass with requests==2.28.0", status: "ok" },
  ],
  affectedComponents: ["test_http_get.py", "test_http_post.py", "test_http_auth.py", "requests import path"],
  nextStep: "Pin requests==2.28.0, or update all imports to use requests.models.PreparedRequest.",
  explanation:
    "The agent ran a routine security audit and upgraded requests to 2.31.0. That version relocated PreparedRequest into requests.models. Five test files import it from the top-level namespace, which now raises ImportError at collection time, causing all 5 tests to fail before execution.",

  timeline: [
    { id: "t1", time: "09:02:11", kind: "AGENT", title: "Agent ran pip-audit — found 2 advisories",  status: "warn", relevant: false },
    { id: "t2", time: "09:03:40", kind: "DEP",   title: "Upgraded requests 2.28.0 → 2.31.0",        status: "warn", relevant: true, detail: "pip install requests==2.31.0\nSuccessfully installed requests-2.31.0 urllib3-2.0.7" },
    { id: "t3", time: "09:03:45", kind: "GIT",   title: "Committed requirements.txt",               status: "info", relevant: true, detail: "commit def5678: fix: patch requests CVE-2023-32681" },
    { id: "t4", time: "09:04:00", kind: "TEST",  title: "Local tests — 40 passed (no import check)", status: "ok",  relevant: false },
    { id: "t5", time: "09:05:12", kind: "CI",    title: "CI triggered",                             status: "info", relevant: true },
    { id: "t6", time: "09:05:55", kind: "TEST",  title: "CI tests — 35 passed, 5 failed",           status: "fail", relevant: true, detail: "FAILED tests/test_http_get.py::test_get_user\nImportError: cannot import name 'PreparedRequest' from 'requests'" },
    { id: "t7", time: "09:06:01", kind: "CI",    title: "CI build failed",                          status: "fail", relevant: true },
  ],

  hypothesis: "Pinning requests==2.28.0 in requirements.txt will resolve all 5 import failures.",
  control:    { label: "requests==2.31.0", result: "5 failed, ImportError", status: "fail" },
  experiment: { label: "requests==2.28.0", result: "40 passed, 0 failed",   status: "ok" },
  verified:   true,

  regressionTest: `# regression: verify requests PreparedRequest import is accessible
# generated by Debug Vitals

def test_requests_prepared_request_importable():
    """Ensure PreparedRequest is importable from expected namespace."""
    try:
        from requests import PreparedRequest  # noqa: F401
    except ImportError:
        from requests.models import PreparedRequest  # noqa: F401
    assert PreparedRequest is not None`,
}

// ── Scenario 3: Auth regression ───────────────────────────────────────────────
const authScenario: Scenario = {
  id: "auth-regression",
  title: "Auth middleware removed by refactor",
  description: "8 security tests failed after agent removed token validation.",

  runtime:      { label: "Python", version: "3.12.0", ok: true },
  ciStatus:     "failing",
  activeFailure: "CI failed: 8 security tests",
  testSummary:  { total: 25, passed: 17, failed: 8 },
  deps: [
    { name: "fastapi",   version: "0.110.0", ok: true },
    { name: "pyjwt",     version: "2.8.0",   ok: true },
    { name: "httpx",     version: "0.27.0",  ok: true },
  ],
  services: [
    { name: "Auth service", status: "degraded" },
    { name: "PostgreSQL",   status: "up" },
    { name: "GitHub CI",    status: "down" },
  ],

  rootCause: "Agent removed token validation in auth middleware during a performance refactor, causing all unauthenticated requests to return 200 instead of 401.",
  confidence: 97,
  rootCauses: [
    { rank: 1, score: 0.97, reason: "AuthMiddleware.__call__ no longer validates token — all requests pass through." },
    { rank: 2, score: 0.21, reason: "JWT secret not rotated — old tokens still accepted if validation were re-enabled." },
  ],
  causalChain: [
    { id: "c1", label: "Agent action",       sublabel: "Removed verify_token() call in auth.py", kind: "agent", status: "fail" },
    { id: "c2", label: "Code change",        sublabel: "AuthMiddleware skips token check",        kind: "git",   status: "fail" },
    { id: "c3", label: "Auth bypass",        sublabel: "All requests return 200 regardless of token", kind: "env", status: "fail" },
    { id: "c4", label: "8 tests failed",     sublabel: "AssertionError: expected 401, got 200",   kind: "test",  status: "fail" },
    { id: "c5", label: "CI build failed",    sublabel: "job: test-security — conclusion: failure", kind: "ci",   status: "fail" },
  ],
  evidence: [
    { id: "e1", label: "Removed line",       file: "app/middleware/auth.py", value: "- if not token or not verify_token(token):\n-     raise HTTPException(status_code=401)", status: "fail" },
    { id: "e2", label: "Current code",       file: "app/middleware/auth.py", value: "# FIXME: skipped for perf testing\npass", status: "fail" },
    { id: "e3", label: "Failing assertion",  file: "tests/test_auth.py",     value: "AssertionError: assert 200 == 401", status: "fail" },
    { id: "e4", label: "Git diff",           file: "git diff HEAD~1",        value: "@@ -14 +14 @@\n-  raise HTTPException(status_code=401)\n+  pass", status: "fail" },
  ],
  affectedComponents: ["app/middleware/auth.py", "8 security tests", "All authenticated routes"],
  nextStep: "Revert the auth middleware change, or restore the verify_token() call before the pass statement.",
  explanation:
    "The agent was optimising request latency and removed the token verification block in AuthMiddleware as a temporary test. The change was committed and pushed. CI runs the security test suite which asserts that unauthenticated requests return 401 — all 8 tests now fail because every request returns 200.",

  timeline: [
    { id: "t1", time: "11:01:22", kind: "AGENT", title: "Agent started performance profiling",          status: "info", relevant: false },
    { id: "t2", time: "11:02:10", kind: "AGENT", title: "Identified auth middleware as hot path",        status: "warn", relevant: true },
    { id: "t3", time: "11:02:44", kind: "GIT",   title: "Removed verify_token() from AuthMiddleware",   status: "fail", relevant: true, detail: "commit ghi9012: perf: skip token validation for internal calls\n- if not token or not verify_token(token):\n-     raise HTTPException(status_code=401)\n+ pass" },
    { id: "t4", time: "11:03:00", kind: "TEST",  title: "Local tests — 17 passed (no auth tests run)",  status: "warn", relevant: false },
    { id: "t5", time: "11:04:15", kind: "CI",    title: "CI triggered — security suite included",        status: "info", relevant: true },
    { id: "t6", time: "11:05:02", kind: "TEST",  title: "CI tests — 17 passed, 8 failed",               status: "fail", relevant: true, detail: "FAILED tests/test_auth.py::test_unauthenticated_request_returns_401\nAssertionError: assert 200 == 401" },
    { id: "t7", time: "11:05:08", kind: "CI",    title: "CI build failed — security regression detected", status: "fail", relevant: true },
  ],

  hypothesis: "Restoring verify_token() in auth middleware will return 401 for unauthenticated requests.",
  control:    { label: "Auth check removed", result: "8 failed, 200 returned", status: "fail" },
  experiment: { label: "Auth check restored", result: "25 passed, 0 failed",   status: "ok" },
  verified:   true,

  regressionTest: `# regression: unauthenticated requests must return 401
# generated by Debug Vitals

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_unauthenticated_request_returns_401():
    """Ensure auth middleware rejects requests without a valid token."""
    response = client.get("/api/protected-resource")
    assert response.status_code == 401, (
        f"Expected 401 Unauthorized, got {response.status_code}. "
        "Auth middleware may have been bypassed."
    )`,
}

export const DEMO_SCENARIOS: Record<ScenarioId, Scenario> = {
  "node-mismatch": nodeScenario,
  "dep-upgrade":   depUpgradeScenario,
  "auth-regression": authScenario,
}

export const DEFAULT_SCENARIO: ScenarioId = "node-mismatch"
