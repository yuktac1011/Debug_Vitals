"use client"

import { use, useState } from "react"
import { DEMO_SCENARIOS, DEFAULT_SCENARIO, type ScenarioId } from "@/lib/demoData"

export default function RegressionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId }    = use(params)
  const scenarioId       = sessionId.replace("demo-", "") as ScenarioId
  const s                = DEMO_SCENARIOS[scenarioId] ?? DEMO_SCENARIOS[DEFAULT_SCENARIO]
  const [generated, setGenerated] = useState(false)

  if (!s.verified) {
    return (
      <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 700 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
            05 / Regression Guard
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C2222", marginBottom: 6 }}>Regression Guard</h1>
        </div>
        <div style={{ padding: "24px", border: "1px solid #D8E4E4", borderRadius: 6, color: "#718484", fontSize: 13 }}>
          Regression Guard is available after the diagnosis is verified. Complete step 04 first.
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 820 }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          05 / Regression Guard
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C2222", letterSpacing: "-0.3px", marginBottom: 6 }}>
          Generate regression test
        </h1>
        <p style={{ fontSize: 13, color: "#718484" }}>
          One targeted test for this exact failure — prevents recurrence.
        </p>
      </div>

      {/* Confirmed banner */}
      <div style={{
        padding: "14px 20px",
        background: "rgba(43,171,96,0.05)",
        border: "1px solid rgba(43,171,96,0.2)",
        borderRadius: 6,
        marginBottom: 32,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2BAB60", flexShrink: 0, display: "inline-block" }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#2BAB60", marginBottom: 1 }}>Diagnosis confirmed</div>
          <div style={{ fontSize: 12, color: "#718484" }}>
            Hypothesis verified in step 04. Regression test will cover the confirmed root cause.
          </div>
        </div>
      </div>

      {/* Root cause reminder */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 10, fontFamily: "var(--font-mono-jb), monospace" }}>
          Root cause
        </div>
        <div style={{
          padding: "14px 18px",
          background: "#fff",
          border: "1px solid #D8E4E4",
          borderRadius: 6,
          fontSize: 13,
          color: "#1C2222",
          lineHeight: 1.55,
        }}>
          {s.rootCause}
        </div>
      </div>

      {/* Generate button */}
      {!generated ? (
        <button
          className="btn btn-primary"
          onClick={() => setGenerated(true)}
        >
          Generate regression test
        </button>
      ) : (
        <div>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1C2222" }}>
              Regression test generated
            </div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                navigator.clipboard.writeText(s.regressionTest)
              }}
            >
              Copy
            </button>
          </div>

          <pre style={{
            fontFamily: "var(--font-mono-jb), monospace",
            fontSize: 12,
            lineHeight: 1.75,
            color: "#1C2222",
            background: "#F2F6F6",
            border: "1px solid #D8E4E4",
            borderRadius: 6,
            padding: "18px 20px",
            overflow: "auto",
            whiteSpace: "pre",
          }}>
            {s.regressionTest}
          </pre>

          <div style={{ marginTop: 20, padding: "14px 18px", background: "#fff", border: "1px solid #D8E4E4", borderRadius: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
              Instructions
            </div>
            <ol style={{ paddingLeft: 16, fontSize: 12, color: "#718484", lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 4 }}>
              <li>Add this test to your project&apos;s test suite.</li>
              <li>Run it against the current codebase to confirm it fails.</li>
              <li>Apply the fix identified in the root cause analysis.</li>
              <li>Run the test again — it should now pass.</li>
              <li>Keep it in CI to prevent regression.</li>
            </ol>
          </div>
        </div>
      )}
    </main>
  )
}
