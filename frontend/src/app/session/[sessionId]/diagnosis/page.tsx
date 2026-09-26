"use client"

import { use } from "react"
import { DEMO_SCENARIOS, DEFAULT_SCENARIO, type ScenarioId } from "@/lib/demoData"
import CausalChain from "@/components/shared/CausalChain"
import EvidenceBlocks from "@/components/shared/EvidenceBlocks"

export default function DiagnosisPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const scenarioId    = sessionId.replace("demo-", "") as ScenarioId
  const s             = DEMO_SCENARIOS[scenarioId] ?? DEMO_SCENARIOS[DEFAULT_SCENARIO]
  const topCause      = s.rootCauses[0]

  return (
    <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 900 }}>

      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          02 / Diagnosis
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C2222", letterSpacing: "-0.3px", marginBottom: 6 }}>
          Root cause analysis
        </h1>
        <p style={{ fontSize: 13, color: "#718484" }}>
          {s.testSummary.failed} failures traced through the causal chain.
        </p>
      </div>

      {/* ── PRIMARY: Root cause + confidence ─────────────────────────── */}
      <div style={{
        padding: "24px 28px",
        background: "#fff",
        border: "1px solid rgba(219,36,36,0.22)",
        borderLeft: "4px solid #DB2424",
        borderRadius: 6,
        marginBottom: 32,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#DB2424", marginBottom: 12, fontFamily: "var(--font-mono-jb), monospace" }}>
              Root cause
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#1C2222", lineHeight: 1.55, marginBottom: 16, maxWidth: 580 }}>
              {s.rootCause}
            </p>
            <p style={{ fontSize: 13, color: "#718484", lineHeight: 1.65, maxWidth: 560 }}>
              {s.explanation}
            </p>
          </div>
          {/* Confidence meter */}
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <ConfidenceRing value={s.confidence} />
          </div>
        </div>
      </div>

      {/* ── Causal chain ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <SectionHeader title="Causal chain" subtitle="How the failure propagated" />
        <CausalChain steps={s.causalChain} />
      </div>

      {/* ── Evidence ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <SectionHeader title="Evidence" subtitle="Files and data that confirm the root cause" />
        <EvidenceBlocks items={s.evidence} />
      </div>

      {/* ── All root causes ranked ───────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <SectionHeader title="Ranked root causes" subtitle={`Top ${s.rootCauses.length} factors by confidence score`} />
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {s.rootCauses.map((c, i) => (
            <div key={c.rank} style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 0",
              borderBottom: i < s.rootCauses.length - 1 ? "1px solid #EBF2F2" : "none",
            }}>
              <span style={{
                fontFamily: "var(--font-mono-jb), monospace",
                fontSize: 11, color: "#9AABAB", minWidth: 24,
              }}>
                #{c.rank}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#1C2222", lineHeight: 1.5 }}>{c.reason}</div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <ScoreBar value={c.score} />
                <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 12, fontWeight: 600, color: scoreColor(c.score), marginTop: 3 }}>
                  {Math.round(c.score * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Affected components ──────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <SectionHeader title="Affected components" subtitle="" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {s.affectedComponents.map((c) => (
            <span key={c} style={{
              display: "inline-block",
              padding: "3px 10px",
              background: "#F2F6F6",
              border: "1px solid #D8E4E4",
              borderRadius: 4,
              fontFamily: "var(--font-mono-jb), monospace",
              fontSize: 11,
              color: "#1C2222",
            }}>
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* ── Next step ────────────────────────────────────────────────── */}
      <div style={{
        padding: "18px 22px",
        background: "rgba(52,193,193,0.05)",
        border: "1px solid rgba(52,193,193,0.2)",
        borderRadius: 6,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#34C1C1", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          Recommended next step
        </div>
        <p style={{ fontSize: 13, color: "#1C2222", lineHeight: 1.6 }}>
          {s.nextStep}
        </p>
      </div>

    </main>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #D8E4E4" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1C2222" }}>{title}</span>
        {subtitle && <span style={{ fontSize: 12, color: "#9AABAB" }}>{subtitle}</span>}
      </div>
    </div>
  )
}

function scoreColor(score: number) {
  if (score >= 0.8) return "#DB2424"
  if (score >= 0.5) return "#b87100"
  return "#718484"
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div style={{ width: 80, height: 4, background: "#EBF2F2", borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        height: 4,
        width: `${Math.round(value * 100)}%`,
        background: scoreColor(value),
        borderRadius: 2,
        transition: "width 0.4s",
      }} />
    </div>
  )
}

function ConfidenceRing({ value }: { value: number }) {
  const r       = 36
  const stroke  = 5
  const norm    = r - stroke / 2
  const circ    = 2 * Math.PI * norm
  const filled  = (value / 100) * circ
  const color   = value >= 80 ? "#DB2424" : value >= 50 ? "#EC9C13" : "#9AABAB"

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={r * 2} height={r * 2} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={r} cy={r} r={norm} fill="none" stroke="#EBF2F2" strokeWidth={stroke} />
        <circle
          cx={r} cy={r} r={norm} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ textAlign: "center", marginTop: -6 }}>
        <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 20, fontWeight: 700, color }}>
          {value}%
        </div>
        <div style={{ fontSize: 10, color: "#9AABAB", marginTop: 1 }}>confidence</div>
      </div>
    </div>
  )
}
