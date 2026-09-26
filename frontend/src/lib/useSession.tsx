"use client"

/**
 * useSession — central data hook for all session pages.
 *
 * Routing logic:
 *   sessionId starts with "demo-"  →  return static demo data immediately
 *   sessionId is a real UUID       →  fetch from live backend API
 *
 * All pages consume this hook. They never import demoData directly.
 *
 * React rules compliance: ALL hooks are called unconditionally at the top
 * level. The live hooks receive `enabled=false` when in demo mode so they
 * perform no network work.
 */

import { useEffect, useState, useCallback } from "react"
import {
  DEMO_SCENARIOS,
  DEFAULT_SCENARIO,
  type ScenarioId,
  type Scenario,
} from "@/lib/demoData"
import {
  getTimeline,
  runDiagnosis,
  runVerify,
  runRegressionGuard,
  type TimelineResponse,
  type DiagnosisResponse,
  type VerificationResponse,
  type RegressionGuardResponse,
  type VerifyRequest,
  type RegressionGuardRequest,
} from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

export type SessionMode = "demo" | "live"

export interface SessionState {
  mode:      SessionMode
  sessionId: string

  // Demo scenario (populated in demo mode)
  scenario?: Scenario

  // Live data (populated in live mode, progressively)
  timeline?:     TimelineResponse
  diagnosis?:    DiagnosisResponse
  verification?: VerificationResponse
  regression?:   RegressionGuardResponse

  // Async state
  loadingTimeline:   boolean
  loadingDiagnosis:  boolean
  loadingVerify:     boolean
  loadingRegression: boolean

  error?: string

  // Actions (no-ops in demo mode)
  fetchTimeline:   (opts?: { event_type?: string; include_payload?: boolean; limit?: number }) => Promise<void>
  fetchDiagnosis:  (opts?: { top_n?: number; include_graph?: boolean }) => Promise<void>
  fetchVerify:     (req: VerifyRequest) => Promise<void>
  fetchRegression: (req: RegressionGuardRequest) => Promise<void>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSession(sessionId: string): SessionState {
  const isDemo = sessionId.startsWith("demo-")

  // Resolve demo scenario unconditionally (safe — no conditional hooks below)
  const scenarioId = sessionId.replace("demo-", "") as ScenarioId
  const scenario   = DEMO_SCENARIOS[scenarioId] ?? DEMO_SCENARIOS[DEFAULT_SCENARIO]

  // Live state — always declared, disabled in demo mode
  const [timeline,     setTimeline]     = useState<TimelineResponse | undefined>()
  const [diagnosis,    setDiagnosis]    = useState<DiagnosisResponse | undefined>()
  const [verification, setVerification] = useState<VerificationResponse | undefined>()
  const [regression,   setRegression]   = useState<RegressionGuardResponse | undefined>()

  const [loadingTimeline,   setLoadingTimeline]   = useState(false)
  const [loadingDiagnosis,  setLoadingDiagnosis]  = useState(false)
  const [loadingVerify,     setLoadingVerify]      = useState(false)
  const [loadingRegression, setLoadingRegression]  = useState(false)
  const [error,             setError]              = useState<string | undefined>()

  // Auto-load timeline on mount for live sessions only
  useEffect(() => {
    if (isDemo) return
    fetchTimeline()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isDemo])

  const fetchTimeline = useCallback(async (
    opts: { event_type?: string; include_payload?: boolean; limit?: number } = {}
  ) => {
    if (isDemo) return
    setLoadingTimeline(true)
    setError(undefined)
    try {
      const data = await getTimeline(sessionId, { limit: opts.limit ?? 100, ...opts })
      setTimeline(data)
    } catch (e: unknown) {
      setError(errorMessage(e))
    } finally {
      setLoadingTimeline(false)
    }
  }, [sessionId, isDemo])

  const fetchDiagnosis = useCallback(async (
    opts: { top_n?: number; include_graph?: boolean } = {}
  ) => {
    if (isDemo) return
    setLoadingDiagnosis(true)
    setError(undefined)
    try {
      const data = await runDiagnosis(sessionId, { top_n: opts.top_n ?? 5, include_graph: opts.include_graph ?? false })
      setDiagnosis(data)
    } catch (e: unknown) {
      setError(errorMessage(e))
    } finally {
      setLoadingDiagnosis(false)
    }
  }, [sessionId, isDemo])

  const fetchVerify = useCallback(async (req: VerifyRequest) => {
    if (isDemo) return
    setLoadingVerify(true)
    setError(undefined)
    try {
      const data = await runVerify(sessionId, req)
      setVerification(data)
    } catch (e: unknown) {
      setError(errorMessage(e))
    } finally {
      setLoadingVerify(false)
    }
  }, [sessionId, isDemo])

  const fetchRegression = useCallback(async (req: RegressionGuardRequest) => {
    if (isDemo) return
    setLoadingRegression(true)
    setError(undefined)
    try {
      const data = await runRegressionGuard(sessionId, req)
      setRegression(data)
    } catch (e: unknown) {
      setError(errorMessage(e))
    } finally {
      setLoadingRegression(false)
    }
  }, [sessionId, isDemo])

  // ── Demo mode — return static scenario data, actions are no-ops ───────────
  if (isDemo) {
    return {
      mode: "demo",
      sessionId,
      scenario,
      loadingTimeline:   false,
      loadingDiagnosis:  false,
      loadingVerify:     false,
      loadingRegression: false,
      fetchTimeline:   async () => {},
      fetchDiagnosis:  async () => {},
      fetchVerify:     async () => {},
      fetchRegression: async () => {},
    }
  }

  // ── Live mode ─────────────────────────────────────────────────────────────
  return {
    mode: "live",
    sessionId,
    timeline,
    diagnosis,
    verification,
    regression,
    loadingTimeline,
    loadingDiagnosis,
    loadingVerify,
    loadingRegression,
    error,
    fetchTimeline,
    fetchDiagnosis,
    fetchVerify,
    fetchRegression,
  }
}

function errorMessage(e: unknown): string {
  if (e && typeof e === "object") {
    const err = e as { error?: { message?: string }; message?: string; status?: number }
    if (err.error?.message) return err.error.message
    if (err.message)        return err.message
    if (err.status)         return `HTTP ${err.status}`
  }
  return "Unknown error"
}
