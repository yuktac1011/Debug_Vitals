"use client"

import { use, useState } from "react"
import { useSession } from "@/lib/useSession"
import CausalChain from "@/components/shared/CausalChain"
import EvidenceBlocks from "@/components/shared/EvidenceBlocks"
import type { DiagnosisResponse } from "@/lib/api"
import type { Evidence, CausalStep, RootCause } from "@/lib/demoData"

export default function DiagnosisPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId }     = use(params)
  const sess              = useSession(sessionId)
  const [topN, setTopN]   = useState(5)
  const [withGraph, setWithGraph] = useState(false)

  return (
    <main className="animate-float-in">
      {/* Uniform Page Header */}
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#34C1C1", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
          02 / AI Root Cause Analysis
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1C2222", letterSpacing: "-0.5px" }}>
            Root Cause Diagnosis & Reasoning
          </h1>
          <ModeBadge mode={sess.mode} />
        </div>
      </div>

      {/* Non-Technical Info Banner */}
      <div className="info-callout" style={{ marginBottom: 28 }}>
        <div className="info-callout-icon">i</div>
        <div>
          <strong>What is Diagnosis?</strong> Rather than dumping raw error logs, Debug Vitals calculates the exact root cause behind your failure and explains it in plain English with supporting evidence.
        </div>
      </div>

      {/* Demo mode */}
      {sess.mode === "demo" && sess.scenario && (
        <DiagnosisLayout
          rootCause={sess.scenario.rootCause}
          confidence={sess.scenario.confidence}
          explanation={sess.scenario.explanation}
          rootCauses={sess.scenario.rootCauses}
          causalChain={sess.scenario.causalChain}
          evidence={sess.scenario.evidence}
          affectedComponents={sess.scenario.affectedComponents}
          nextStep={sess.scenario.nextStep}
          sessionId={sessionId}
          mode="demo"
        />
      )}

      {/* Live mode controls */}
      {sess.mode === "live" && !sess.diagnosis && (
        <div className="glass-card" style={{ padding: "24px 28px", marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1C2222", marginBottom: 8 }}>
            Trigger Root Cause Reasoning Engine
          </div>
          <p style={{ fontSize: 13, color: "#718484", marginBottom: 18 }}>
            Analyze ingested signals for this session and rank potential root causes by evidence probability.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#718484", display: "block", marginBottom: 4 }}>Top Causes to Rank</label>
              <input
                type="number" min={1} max={10} value={topN}
                onChange={e => setTopN(Number(e.target.value))}
                style={{
                  width: 80, padding: "6px 10px", borderRadius: 6, border: "1px solid #c4c9cf",
                  fontFamily: "var(--font-mono)", fontSize: 13, color: "#1C2222",
                  background: "#fff", outline: "none",
                }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1C2222", cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={withGraph} onChange={e => setWithGraph(e.target.checked)} style={{ width: 16, height: 16 }} />
              Include NetworkX Causal Graph
            </label>
          </div>
          <button
            className="btn btn-primary"
            disabled={sess.loadingDiagnosis}
            onClick={() => sess.fetchDiagnosis({ top_n: topN, include_graph: withGraph })}
          >
            {sess.loadingDiagnosis ? "Running Diagnostic Engine…" : "Run Root Cause Diagnosis"}
          </button>
          {sess.error && <div style={{ marginTop: 12, fontSize: 13, color: "#DB2424", fontWeight: 600 }}>{sess.error}</div>}
        </div>
      )}

      {/* Live mode result */}
      {sess.mode === "live" && sess.diagnosis && (
        <>
          <DiagnosisLayout
            rootCause={sess.diagnosis.root_causes[0]?.reason ?? "No root cause identified"}
            confidence={Math.round((sess.diagnosis.root_causes[0]?.score ?? 0) * 100)}
            explanation={sess.diagnosis.explanation ?? ""}
            rootCauses={(sess.diagnosis.root_causes ?? []).map(c => ({ rank: c.rank, score: c.score, reason: c.reason }))}
            causalChain={(sess.diagnosis.root_causes ?? []).slice(0, 5).map((c, i) => ({
              id: c.event_id ?? `c${i}`,
              label: `Root cause #${c.rank}`,
              sublabel: c.reason.slice(0, 60) + (c.reason.length > 60 ? "…" : ""),
              kind: "agent" as const,
              status: "fail" as const,
            }))}
            evidence={Object.entries(sess.diagnosis.root_causes?.[0]?.contributing_factors ?? {}).map(([k, v], i) => ({
              id: `ev${i}`,
              label: k,
              value: `Correlation evidence weight: ${(v * 100).toFixed(0)}%`,
              status: v > 0.5 ? "fail" : "warn",
            } as Evidence))}
            affectedComponents={[]}
            nextStep={`Diagnosis ID: ${sess.diagnosis.id}`}
            sessionId={sessionId}
            mode="live"
            liveData={sess.diagnosis}
          />
          <div style={{ marginTop: 24 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => sess.fetchDiagnosis({ top_n: topN, include_graph: withGraph })}
              disabled={sess.loadingDiagnosis}
            >
              {sess.loadingDiagnosis ? "Re-evaluating…" : "Re-run Diagnosis Engine"}
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
      {/* Live metadata strip */}
      {mode === "live" && liveData && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <span className="badge badge-success">
            Status: {liveData.status}
          </span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#718484" }}>
            Analysed {liveData.events_analysed ?? 0} signals
          </span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#718484" }}>
            Duration: {(liveData.duration_ms ?? 0).toFixed(0)} ms
          </span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#718484" }}>
            Source: {liveData.explanation_source ?? "template"}
          </span>
        </div>
      )}

      {/* Primary Root Cause Block */}
      <div className="glass-card" style={{
        padding: "24px 28px", marginBottom: 32,
        borderLeft: "6px solid #DB2424",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#DB2424", marginBottom: 10, fontFamily: "var(--font-mono)" }}>
              Primary Root Cause Identified
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1C2222", lineHeight: 1.45, marginBottom: explanation ? 12 : 0 }}>
              {rootCause}
            </h2>
            {explanation && (
              <p style={{ fontSize: 13, color: "#636e72", lineHeight: 1.6 }}>
                {explanation}
              </p>
            )}
          </div>
          <ConfidenceRing value={confidence} />
        </div>
      </div>

      {/* Causal chain */}
      {causalChain.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Chronological Causal Chain" subtitle="How the initial change propagated into a system failure" />
          <CausalChain steps={causalChain} />
        </div>
      )}

      {/* Evidence */}
      {evidence.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Supporting Evidence & Data" subtitle="Specific file changes and version logs proving this root cause" />
          <EvidenceBlocks items={evidence} />
        </div>
      )}

      {/* Ranked causes */}
      {rootCauses.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionHeader
            title="Ranked Potential Root Causes"
            subtitle={`Top ${rootCauses.length} candidate causes weighted by evidence`}
          />
          <div className="glass-card" style={{ padding: "16px 24px" }}>
            {rootCauses.map((c, i) => (
              <div key={c.rank} style={{
                display: "flex", alignItems: "center", gap: 16, padding: "12px 0",
                borderBottom: i < rootCauses.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
              }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800, color: "#34C1C1", minWidth: 28 }}>
                  #{c.rank}
                </span>
                <div style={{ flex: 1, fontSize: 13, color: "#1C2222", fontWeight: 600, lineHeight: 1.4 }}>{c.reason}</div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <ScoreBar value={c.score} />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: scoreColor(c.score), marginTop: 3 }}>
                    {Math.round(c.score * 100)}% Probability
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Affected components */}
      {affectedComponents.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Affected System Components" subtitle="Files and services impacted by this issue" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {affectedComponents.map(c => (
              <span key={c} style={{ padding: "6px 14px", background: "#fff", boxShadow: "var(--shadow-neo-sm)", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "#1C2222" }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Next step recommendation */}
      <div style={{
        padding: "20px 24px",
        background: "rgba(52, 193, 193, 0.08)",
        border: "1px solid rgba(52, 193, 193, 0.25)",
        borderRadius: "var(--radius-sm)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#007777", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
          💡 Recommended Action
        </div>
        <p style={{ fontSize: 13, color: "#1C2222", lineHeight: 1.6, fontWeight: 600 }}>
          {nextStep}
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2222" }}>{title}</span>
      {subtitle && <span style={{ fontSize: 12, color: "#718484" }}>{subtitle}</span>}
    </div>
  )
}

function scoreColor(score: number) {
  return score >= 0.8 ? "#DB2424" : score >= 0.5 ? "#b87100" : "#718484"
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div style={{ width: 80, height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: 6, width: `${Math.round(value * 100)}%`, background: scoreColor(value), borderRadius: 3 }} />
    </div>
  )
}

function ConfidenceRing({ value }: { value: number }) {
  const r      = 38
  const stroke = 5
  const norm   = r - stroke / 2
  const circ   = 2 * Math.PI * norm
  const filled = (value / 100) * circ
  const color  = value >= 80 ? "#DB2424" : value >= 50 ? "#EC9C13" : "#34C1C1"
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "#fff", padding: "14px 20px", borderRadius: 12, boxShadow: "var(--shadow-neo-sm)", flexShrink: 0 }}>
      <svg width={r * 2} height={r * 2} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={r} cy={r} r={norm} fill="none" stroke="#e0e5ec" strokeWidth={stroke} />
        <circle cx={r} cy={r} r={norm} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
      </svg>
      <div style={{ textAlign: "center", marginTop: -6 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 800, color }}>{value}%</div>
        <div style={{ fontSize: 10, color: "#718484", fontWeight: 700, textTransform: "capitalize" }}>Confidence</div>
      </div>
    </div>
  )
}

function ModeBadge({ mode }: { mode: "demo" | "live" }) {
  if (mode === "demo") {
    return (
      <span className="badge badge-primary">
        Interactive Demo
      </span>
    )
  }
  return (
    <span className="badge badge-success">
      Live Session
    </span>
  )
}
