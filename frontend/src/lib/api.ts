/**
 * Typed API client for the Debug Vitals backend.
 * Base URL: same origin (FastAPI serves both frontend static + API).
 * All paths match the backend routers exactly.
 */

const BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_BACKEND_URL ?? "")
  : (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000")

// ── Shared types ─────────────────────────────────────────────────────────────

export interface ApiError {
  error: { code: string; message: string; request_id?: string }
}

async function apiFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({ _raw: "non-json response" }))
  if (!res.ok) throw { status: res.status, ...data }
  return data as T
}

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "healthy" | "degraded"
  checks: Record<string, { status: string; version?: string; environment?: string; error?: string }>
}

export const getHealth = (): Promise<HealthResponse> =>
  apiFetch("GET", "/api/v1/health")

// ── Events ────────────────────────────────────────────────────────────────────

export type EventType =
  | "agent_action" | "git_diff" | "env_snapshot"
  | "test_result"  | "ci_result" | "dependency" | "custom"

export type Severity = "debug" | "info" | "warning" | "error" | "critical"

export interface EventCreate {
  session_id:  string
  event_type:  EventType
  occurred_at: string        // ISO 8601
  external_id?: string
  source?:      string
  severity?:    Severity
  summary?:     string
  payload?:     Record<string, unknown>
}

export interface EventBatchCreate {
  events: EventCreate[]
}

export interface EventBatchResponse {
  accepted:         string[]
  deduplicated:     string[]
  total_received:   number
  total_accepted:   number
}

export const ingestEvents = (batch: EventBatchCreate): Promise<EventBatchResponse> =>
  apiFetch("POST", "/api/v1/events", batch)

// ── Timeline ──────────────────────────────────────────────────────────────────

export interface TimelineEventItem {
  id:           string
  event_type:   EventType
  occurred_at:  string
  ingested_at:  string
  source?:      string
  severity?:    Severity
  summary?:     string
  payload?:     Record<string, unknown>
}

export interface TimelineResponse {
  session_id:  string
  events:      TimelineEventItem[]
  total_count: number
  has_more:    boolean
  offset:      number
  limit:       number
}

export function getTimeline(
  sessionId: string,
  opts: { limit?: number; offset?: number; event_type?: string; include_payload?: boolean } = {}
): Promise<TimelineResponse> {
  const p = new URLSearchParams()
  if (opts.limit            !== undefined) p.set("limit",           String(opts.limit))
  if (opts.offset           !== undefined) p.set("offset",          String(opts.offset))
  if (opts.event_type)                     p.set("event_type",      opts.event_type)
  if (opts.include_payload)                p.set("include_payload", "true")
  return apiFetch("GET", `/api/v1/session/${sessionId}/timeline?${p}`)
}

// ── Diagnosis ─────────────────────────────────────────────────────────────────

export interface RootCauseItem {
  event_id:             string
  score:                number
  rank:                 number
  reason:               string
  contributing_factors: Record<string, number>
}

export interface DiagnosisResponse {
  id:                  string
  session_id:          string
  status:              string
  root_causes:         RootCauseItem[]
  explanation?:        string
  explanation_source?: "llm" | "template"
  events_analysed?:    number
  duration_ms?:        number
  created_at:          string
  completed_at?:       string
  graph_snapshot?:     Record<string, unknown>
}

export interface DiagnoseRequest {
  top_n?:         number
  include_graph?: boolean
}

export const runDiagnosis = (
  sessionId: string,
  req: DiagnoseRequest = {}
): Promise<DiagnosisResponse> =>
  apiFetch("POST", `/api/v1/session/${sessionId}/diagnose`, req)

// ── Verification ──────────────────────────────────────────────────────────────

export interface VerifyRequest {
  docker_image:  string
  command:       string
  environment?:  Record<string, string>
  diagnosis_id?: string
}

export interface VerificationResponse {
  id:           string
  session_id:   string
  diagnosis_id?: string
  status:       string
  docker_image?: string
  command?:     string
  exit_code?:   number
  stdout?:      string
  stderr?:      string
  run_metadata?: Record<string, unknown>
  created_at:   string
  started_at?:  string
  completed_at?: string
}

export const runVerify = (
  sessionId: string,
  req: VerifyRequest
): Promise<VerificationResponse> =>
  apiFetch("POST", `/api/v1/session/${sessionId}/verify`, req)

// ── Regression Guard ──────────────────────────────────────────────────────────

export interface RegressionGuardRequest {
  diagnosis_id:    string
  top_n_causes?:   number
  docker_image?:   string
  run_immediately?: boolean
  language?:       string
}

export interface RegressionTestItem {
  id:                string
  session_id:        string
  diagnosis_id?:     string
  test_code?:        string
  test_framework?:   string
  target_file_path?: string
  generation_status: string
  run_status?:       string
  run_output?:       string
  is_active:         boolean
  created_at:        string
  last_run_at?:      string
}

export interface RegressionGuardResponse {
  session_id:       string
  diagnosis_id:     string
  tests_generated:  number
  tests_run:        number
  tests_passed:     number
  tests_failed:     number
  tests:            RegressionTestItem[]
}

export const runRegressionGuard = (
  sessionId: string,
  req: RegressionGuardRequest
): Promise<RegressionGuardResponse> =>
  apiFetch("POST", `/api/v1/session/${sessionId}/regression-guard`, req)
