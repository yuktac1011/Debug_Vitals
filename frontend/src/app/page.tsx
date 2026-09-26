"use client"

import Link from "next/link"
import { DEMO_SCENARIOS } from "@/lib/demoData"

const SCENARIO_COLORS: Record<string, string> = {
  "node-mismatch":    "#4B85BE",
  "dep-upgrade":      "#EC9C13",
  "auth-regression":  "#DB2424",
}

export default function LandingPage() {
  const scenarios = Object.values(DEMO_SCENARIOS)

  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-bg)" }}>
      {/* Header */}
      <header style={{
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-neo-sm)",
        padding: "0 48px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 32,
      }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1C2222", letterSpacing: "-0.3px" }}>
            Agent<span style={{ color: "#34C1C1" }}>Doctor</span>
          </span>
          <span style={{ marginLeft: 16, fontSize: 12, color: "#9AABAB", fontFamily: "var(--font-mono-jb), monospace" }}>
            v0.1 — beta
          </span>
        </div>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, color: "#34C1C1", textDecoration: "none" }}
        >
          API docs &rarr;
        </a>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#34C1C1", marginBottom: 14, fontFamily: "var(--font-mono-jb), monospace",
          }}>
            Developer diagnostic tool
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 700,
            color: "#1C2222",
            lineHeight: 1.15,
            letterSpacing: "-0.5px",
            marginBottom: 20,
          }}>
            Diagnose the cause,<br />not just the symptom.
          </h1>
          <p style={{
            fontSize: 16,
            color: "#718484",
            lineHeight: 1.65,
            maxWidth: 520,
            marginBottom: 32,
          }}>
            AgentDoctor connects agent actions &rarr; code changes &rarr; environment &rarr; tests &rarr; CI failures
            and identifies the root cause so you can fix the right thing.
          </p>

          {/* Flow diagram */}
          <div style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 4,
            padding: "16px 20px",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-neo-inset)",
            borderRadius: "var(--radius)",
            marginBottom: 40,
          }}>
            {[
              { label: "Agent Action", color: "#4B85BE" },
              { label: "Code Change",  color: "#718484" },
              { label: "Environment",  color: "#EC9C13" },
              { label: "Tests",        color: "#EC9C13" },
              { label: "CI Failure",   color: "#DB2424" },
            ].map((step, i, arr) => (
              <span key={step.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: step.color,
                  fontFamily: "var(--font-mono-jb), monospace",
                }}>
                  {step.label}
                </span>
                {i < arr.length - 1 && (
                  <span style={{ color: "#9AABAB", fontSize: 14, margin: "0 2px" }}>&rarr;</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Demo scenarios */}
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1C2222", marginBottom: 4 }}>
              Load a demo investigation
            </h2>
            <p style={{ fontSize: 13, color: "#718484" }}>
              Three realistic failure scenarios. No backend required.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {scenarios.map((s, i) => (
              <Link
                key={s.id}
                href={`/session/demo-${s.id}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 20,
                  padding: "20px 24px",
                  background: "var(--color-surface)",
                  boxShadow: "var(--shadow-neo)",
                  borderRadius: "var(--radius)",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-neo-inset)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-neo)")}
              >
                <div style={{
                  marginTop: 3,
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: SCENARIO_COLORS[s.id] || "#34C1C1",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#1C2222", marginBottom: 3 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#718484" }}>
                    {s.description}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "2px 8px", borderRadius: 4, fontSize: 11,
                    fontWeight: 600, border: "1px solid rgba(219,36,36,0.2)",
                    background: "rgba(219,36,36,0.07)", color: "#DB2424",
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#DB2424", display: "inline-block" }} />
                    {s.testSummary.failed} failed
                  </div>
                  <span style={{ fontSize: 12, color: "#9AABAB" }}>&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* What it does */}
        <div style={{ marginTop: 64, paddingTop: 40, borderTop: "1px solid #D8E4E4" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#1C2222", marginBottom: 24 }}>
            5-step investigation workflow
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 0 }}>
            {[
              { n: "01", label: "Checkup",          desc: "Runtime, deps, services, active failure" },
              { n: "02", label: "Diagnosis",        desc: "Root cause, confidence, causal chain" },
              { n: "03", label: "Timeline",         desc: "Forensic event log" },
              { n: "04", label: "Verification",     desc: "Control vs experiment hypothesis" },
              { n: "05", label: "Regression Guard", desc: "Targeted test for this exact failure" },
            ].map((step, i) => (
              <div key={step.n} style={{
                padding: "16px 20px",
                background: "var(--color-surface)",
                boxShadow: "var(--shadow-neo-sm)",
                borderRadius: "var(--radius-sm)",
                margin: 8,
              }}>
                <div style={{
                  fontFamily: "var(--font-mono-jb), monospace",
                  fontSize: 11, color: "#34C1C1", marginBottom: 6,
                }}>
                  {step.n}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#1C2222", marginBottom: 4 }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 12, color: "#9AABAB", lineHeight: 1.5 }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
