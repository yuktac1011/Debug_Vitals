"use client"

import { use } from "react"
import { DEMO_SCENARIOS, DEFAULT_SCENARIO, type ScenarioId } from "@/lib/demoData"

export default function VerifyPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const scenarioId    = sessionId.replace("demo-", "") as ScenarioId
  const s             = DEMO_SCENARIOS[scenarioId] ?? DEMO_SCENARIOS[DEFAULT_SCENARIO]

  return (
    <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 820 }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          04 / Verification
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C2222", letterSpacing: "-0.3px", marginBottom: 6 }}>
          Verify runtime hypothesis
        </h1>
        <p style={{ fontSize: 13, color: "#718484" }}>
          Run control and experiment to confirm the root cause.
        </p>
      </div>

      {/* Hypothesis */}
      <div style={{
        padding: "18px 22px",
        background: "#fff",
        border: "1px solid #D8E4E4",
        borderRadius: 6,
        marginBottom: 32,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4B85BE", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          Hypothesis
        </div>
        <p style={{ fontSize: 14, color: "#1C2222", fontStyle: "italic", lineHeight: 1.6 }}>
          &ldquo;{s.hypothesis}&rdquo;
        </p>
      </div>

      {/* Control vs Experiment */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {/* Control */}
        <div style={{
          padding: "20px 22px",
          background: "#fff",
          border: "1px solid rgba(219,36,36,0.2)",
          borderTop: "3px solid #DB2424",
          borderRadius: 6,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#DB2424", marginBottom: 12, fontFamily: "var(--font-mono-jb), monospace" }}>
            Control
          </div>
          <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 13, fontWeight: 600, color: "#1C2222", marginBottom: 10 }}>
            {s.control.label}
          </div>
          <div style={{ fontSize: 12, color: "#718484", marginBottom: 12, lineHeight: 1.5 }}>
            {s.control.result}
          </div>
          <OutcomeBadge status="fail" label="Failed" />
        </div>

        {/* Experiment */}
        <div style={{
          padding: "20px 22px",
          background: "#fff",
          border: `1px solid ${s.experiment.status === "ok" ? "rgba(43,171,96,0.2)" : "rgba(236,156,19,0.22)"}`,
          borderTop: `3px solid ${s.experiment.status === "ok" ? "#2BAB60" : "#EC9C13"}`,
          borderRadius: 6,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: s.experiment.status === "ok" ? "#2BAB60" : "#b87100", marginBottom: 12, fontFamily: "var(--font-mono-jb), monospace" }}>
            Experiment
          </div>
          <div style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 13, fontWeight: 600, color: "#1C2222", marginBottom: 10 }}>
            {s.experiment.label}
          </div>
          <div style={{ fontSize: 12, color: "#718484", marginBottom: 12, lineHeight: 1.5 }}>
            {s.experiment.result}
          </div>
          <OutcomeBadge status={s.experiment.status} label={s.experiment.status === "ok" ? "Passed" : "Running"} />
        </div>
      </div>

      {/* Result / Confidence change */}
      {s.verified && (
        <div style={{
          padding: "20px 24px",
          background: "rgba(43,171,96,0.05)",
          border: "1px solid rgba(43,171,96,0.2)",
          borderRadius: 6,
          marginBottom: 32,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2BAB60", marginBottom: 10, fontFamily: "var(--font-mono-jb), monospace" }}>
            Result
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#1C2222", marginBottom: 4 }}>
                Hypothesis confirmed.
              </div>
              <div style={{ fontSize: 12, color: "#718484" }}>
                Experiment passed with 0 failures. Root cause is verified.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <ConfidenceArrow from="Medium" to="High" />
            </div>
          </div>
        </div>
      )}

      {/* Methodology note */}
      <div style={{ borderTop: "1px solid #EBF2F2", paddingTop: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 10, fontFamily: "var(--font-mono-jb), monospace" }}>
          Method
        </div>
        <p style={{ fontSize: 12, color: "#9AABAB", lineHeight: 1.65 }}>
          Control and experiment isolate the variable identified in the root cause analysis.
          A passing experiment with a failing control confirms the causal relationship.
        </p>
      </div>

    </main>
  )
}

function OutcomeBadge({ status, label }: { status: "ok" | "fail" | "running"; label: string }) {
  const cfg = {
    ok:      { bg: "rgba(43,171,96,0.07)",  border: "rgba(43,171,96,0.2)",  color: "#2BAB60" },
    fail:    { bg: "rgba(219,36,36,0.07)",  border: "rgba(219,36,36,0.2)",  color: "#DB2424" },
    running: { bg: "rgba(236,156,19,0.07)", border: "rgba(236,156,19,0.22)", color: "#b87100" },
  }[status]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
      {label}
    </span>
  )
}

function ConfidenceArrow({ from, to }: { from: string; to: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        padding: "2px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
        background: "rgba(236,156,19,0.08)", border: "1px solid rgba(236,156,19,0.22)", color: "#b87100",
      }}>{from}</span>
      <span style={{ color: "#9AABAB", fontSize: 14 }}>&rarr;</span>
      <span style={{
        padding: "2px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
        background: "rgba(43,171,96,0.08)", border: "1px solid rgba(43,171,96,0.2)", color: "#2BAB60",
      }}>{to}</span>
      <span style={{ fontSize: 10, color: "#9AABAB" }}>confidence</span>
    </div>
  )
}
