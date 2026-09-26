"use client"

import { use, useState } from "react"
import { useSession } from "@/lib/useSession"
import CausalChain from "@/components/shared/CausalChain"
import EvidenceBlocks from "@/components/shared/EvidenceBlocks"
import type { DiagnosisResponse, RootCauseItem } from "@/lib/api"
import type { Evidence, CausalStep, RootCause } from "@/lib/demoData"

export default function DiagnosisPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId }     = use(params)
  const sess              = useSession(sessionId)
  const [topN, setTopN]   = useState(5)
  const [withGraph, setWithGraph] = useState(false)

  // ── Demo mode ───────────────────────────────────────────────────────────────
  if (sess.mode === "demo" && sess.scenario) {
    const s = sess.scenario
    return (
      <DiagnosisLayout
        rootCause={s.rootCause}
        confidence={s.confidence}
        explanation={s.explanation}
        rootCauses={s.rootCauses}
        causalChain={s.causalChain}
        evidence={s.evidence}
        affectedComponents={s.affectedComponents}
        nextStep={s.nextStep}
        sessionId={sessionId}
        mode="demo"
      />
    )
  }

  // ── Live mode ────────────────────────────────────────────────────────────────
  const { diagnosis, loadingDiagnosis, error, fetchDiagnosis } = sess

  // Map live API response → display types
  const liveCauses: RootCause[] = (diagnosis?.root_causes ?? []).map(c => ({
    rank:    c.rank,
    score:   c.score,
    reason:  c.reason,
  }))

  const liveChain: CausalStep[] = (diagnosis?.root_causes ?? []).slice(0, 5).map((c, i) => ({
    id:       c.event_id ?? `c${i}`,
    label:    `Root cause #${c.rank}`,
    sublabel: c.reason.slice(0, 60) + (c.reason.length > 60 ? "…" : ""),
    kind:     "agent" as const,
    status:   "fail" as const,
  }))

  const liveEvidence: Evidence[] = Object.entries(
    (diagnosis?.root_causes?.[0]?.contributing_factors ?? {})
  ).map(([k, v], i) => ({
    id:     `ev${i}`,
    label:  k,
    value:  `weight: ${(v * 100).toFixed(0)}%`,
    status: v > 0.5 ? "fail" : "warn",
  } as Evidence))

  return (
    <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          02 / Diagnosis
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", letterSpacing: "-0.3px", marginBottom: 6 }}>
          Root cause analysis
        </h1>
      </div>

      {/* Run controls */}
      {!diagnosis && (
        <div style={{
          padding: "20px 24px", marginBottom: 28,
          background: "var(--skeuo-bg)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 6,
        }} className="skeuo-panel">
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", marginBottom: 14 }}>
            Run diagnosis on this session
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", display: "block", marginBottom: 4 }}>Top N root causes</label>
              <input
                type="number" min={1} max={50} value={topN}
                onChange={e => setTopN(Number(e.target.value))}
                style={{
                  width: 70, padding: "5px 8px", borderRadius: 4, border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)",
                  fontFamily: "var(--font-mono-jb), monospace", fontSize: 12, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)",
                  background: "var(--skeuo-bg)", outline: "none",
                }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--skeuo-text-inset-color)", cursor: "pointer" }}>
              <input type="checkbox" checked={withGraph} onChange={e => setWithGraph(e.target.checked)} />
              Include correlation graph
            </label>
          </div>
          <button
            className="btn btn-primary"
            disabled={loadingDiagnosis}
            onClick={() => fetchDiagnosis({ top_n: topN, include_graph: withGraph })}
          >
            {loadingDiagnosis ? "Running diagnosis…" : "Run diagnosis"}
          </button>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: "#DB2424" }}>{error}</div>}
        </div>
      )}

      {diagnosis && (
        <>
          <DiagnosisLayout
            rootCause={diagnosis.root_causes[0]?.reason ?? "No root cause identified"}
            confidence={Math.round((diagnosis.root_causes[0]?.score ?? 0) * 100)}
            explanation={diagnosis.explanation ?? ""}
            rootCauses={liveCauses}
            causalChain={liveChain}
            evidence={liveEvidence}
            affectedComponents={[]}
            nextStep={`Diagnosis ID: ${diagnosis.id}`}
            sessionId={sessionId}
            mode="live"
            liveData={diagnosis}
          />
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchDiagnosis({ top_n: topN, include_graph: withGraph })}
              disabled={loadingDiagnosis}
            >
              {loadingDiagnosis ? "Re-running…" : "Re-run diagnosis"}
            </button>
          </div>
        </>
      )}
    </main>
  )
}

// ── Shared layout ──────────────────────────────────────────────────────────────

function DiagnosisLayout({
  rootCause, confidence, explanation, rootCauses, causalChain,
  evidence, affectedComponents, nextStep, mode, liveData,
}: {
  rootCause:            string
  confidence:           number
  explanation:          string
  rootCauses:           RootCause[]
  causalChain:          CausalStep[]
  evidence:             Evidence[]
  affectedComponents:   string[]
  nextStep:             string
  sessionId:            string
  mode:                 "demo" | "live"
  liveData?:            DiagnosisResponse
}) {
  return (
    <div>
      {/* Demo page header */}
      {mode === "demo" && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
            02 / Diagnosis
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", letterSpacing: "-0.3px" }}>
            Root cause analysis
          </h1>
        </div>
      )}

      {/* Live metadata strip */}
      {mode === "live" && liveData && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <StatusPill status={liveData.status} />
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono-jb), monospace", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)" }}>
            {liveData.events_analysed ?? 0} events analysed
          </span>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono-jb), monospace", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)" }}>
            {(liveData.duration_ms ?? 0).toFixed(0)} ms
          </span>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono-jb), monospace", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)" }}>
            source: {liveData.explanation_source ?? "template"}
          </span>
          <span style={{
            fontFamily: "var(--font-mono-jb), monospace", fontSize: 10,
            color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", background: "var(--skeuo-bg)", boxShadow: "inset 6px 6px 10px 0 var(--skeuo-shadow-dark-strong), inset -6px -6px 10px 0 var(--skeuo-shadow-light)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)",
            borderRadius: 3, padding: "1px 7px",
          }}>
            {liveData.id}
          </span>
        </div>
      )}

      {/* Root cause block */}
      <div style={{
        padding: "24px 28px", marginBottom: 32,
        background: "var(--skeuo-bg)",
        border: "1px solid rgba(219,36,36,0.22)",
        borderLeft: "4px solid #DB2424",
        borderRadius: 6,
      }} className="skeuo-panel">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#DB2424", marginBottom: 12, fontFamily: "var(--font-mono-jb), monospace" }}>
              Root cause
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", lineHeight: 1.55, marginBottom: explanation ? 16 : 0, maxWidth: 560 }}>
              {rootCause}
            </p>
            {explanation && (
              <p style={{ fontSize: 13, color: "var(--skeuo-text-inset-color)", lineHeight: 1.65, maxWidth: 560 }}>
                {explanation}
              </p>
            )}
          </div>
          <ConfidenceRing value={confidence} />
        </div>
      </div>

      {/* Causal chain */}
      {causalChain.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <SectionHeader title="Causal chain" subtitle="How the failure propagated" />
          <CausalChain steps={causalChain} />
        </div>
      )}

      {/* Evidence */}
      {evidence.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <SectionHeader title="Evidence" subtitle="Data confirming the root cause" />
          <EvidenceBlocks items={evidence} />
        </div>
      )}

      {/* Ranked causes */}
      {rootCauses.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <SectionHeader
            title="Ranked root causes"
            subtitle={`Top ${rootCauses.length} factors by confidence`}
          />
          {rootCauses.map((c, i) => (
            <div key={c.rank} style={{
              display: "flex", alignItems: "center", gap: 16, padding: "14px 0",
              borderBottom: i < rootCauses.length - 1 ? "1px solid #EBF2F2" : "none",
            }}>
              <span style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 11, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", minWidth: 24 }}>
                #{c.rank}
              </span>
              <div style={{ flex: 1, fontSize: 13, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", lineHeight: 1.5 }}>{c.reason}</div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <ScoreBar value={c.score} />
                <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 12, fontWeight: 600, color: scoreColor(c.score), marginTop: 3 }}>
                  {Math.round(c.score * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live: contributing factors per cause */}
      {mode === "live" && liveData?.root_causes && (
        <div style={{ marginBottom: 36 }}>
          <SectionHeader title="Contributing factors" subtitle="Per root cause" />
          {liveData.root_causes.map(c => (
            <div key={c.rank} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--skeuo-text-inset-color)", marginBottom: 6 }}>
                Rank #{c.rank} — {c.reason.slice(0, 80)}{c.reason.length > 80 ? "…" : ""}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(c.contributing_factors).map(([k, v]) => (
                  <span key={k} style={{
                    fontFamily: "var(--font-mono-jb), monospace", fontSize: 10,
                    padding: "2px 8px", borderRadius: 3,
                    background: "var(--skeuo-bg)", boxShadow: "inset 6px 6px 10px 0 var(--skeuo-shadow-dark-strong), inset -6px -6px 10px 0 var(--skeuo-shadow-light)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)",
                  }}>
                    {k}: {(v * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Affected components */}
      {affectedComponents.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <SectionHeader title="Affected components" subtitle="" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {affectedComponents.map(c => (
              <span key={c} style={{ padding: "3px 10px", background: "var(--skeuo-bg)", boxShadow: "inset 6px 6px 10px 0 var(--skeuo-shadow-dark-strong), inset -6px -6px 10px 0 var(--skeuo-shadow-light)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 4, fontFamily: "var(--font-mono-jb), monospace", fontSize: 11, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)" }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Next step */}
      <div style={{ padding: "18px 22px", background: "rgba(52,193,193,0.05)", border: "1px solid rgba(52,193,193,0.2)", borderRadius: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#34C1C1", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          {mode === "live" ? "Diagnosis ID — use in Verify and Regression Guard" : "Recommended next step"}
        </div>
        <p style={{ fontSize: 13, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", lineHeight: 1.6, fontFamily: mode === "live" ? "var(--font-mono-jb), monospace" : undefined }}>
          {nextStep}
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--skeuo-header-border)" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)" }}>{title}</span>
      {subtitle && <span style={{ fontSize: 12, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginLeft: 10 }}>{subtitle}</span>}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const ok = status === "completed"
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px",
      borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: ok ? "rgba(43,171,96,0.08)" : "rgba(236,156,19,0.08)",
      border: `1px solid ${ok ? "rgba(43,171,96,0.2)" : "rgba(236,156,19,0.22)"}`,
      color: ok ? "#2BAB60" : "#b87100",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ok ? "#2BAB60" : "#EC9C13", display: "inline-block" }} />
      {status}
    </span>
  )
}

function scoreColor(score: number) {
  return score >= 0.8 ? "#DB2424" : score >= 0.5 ? "#b87100" : "#718484"
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div style={{ width: 80, height: 4, background: "#EBF2F2", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: 4, width: `${Math.round(value * 100)}%`, background: scoreColor(value), borderRadius: 2 }} />
    </div>
  )
}

function ConfidenceRing({ value }: { value: number }) {
  const r      = 36
  const stroke = 5
  const norm   = r - stroke / 2
  const circ   = 2 * Math.PI * norm
  const filled = (value / 100) * circ
  const color  = value >= 80 ? "#DB2424" : value >= 50 ? "#EC9C13" : "#9AABAB"
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={r * 2} height={r * 2} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={r} cy={r} r={norm} fill="none" stroke="#EBF2F2" strokeWidth={stroke} />
        <circle cx={r} cy={r} r={norm} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
      </svg>
      <div style={{ textAlign: "center", marginTop: -4 }}>
        <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 20, fontWeight: 700, color }}>{value}%</div>
        <div style={{ fontSize: 10, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)" }}>confidence</div>
      </div>
    </div>
  )
}
