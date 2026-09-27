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
    <div style={{ minHeight: "100dvh", background: "transparent" }} className="animate-float-in">
      {/* Header */}
      <header style={{
        background: "rgba(224, 229, 236, 0.9)",
        backdropFilter: "blur(12px)",
        boxShadow: "var(--shadow-neo-sm)",
        padding: "0 clamp(20px, 4vw, 48px)",
        height: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.6)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #34C1C1, #4B85BE)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 16,
            boxShadow: "0 4px 12px rgba(52, 193, 193, 0.3)",
          }}>
            +
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#1C2222", letterSpacing: "-0.4px" }}>
              Agent<span style={{ color: "#34C1C1" }}>Doctor</span>
            </span>
            <span style={{ marginLeft: 12, fontSize: 11, color: "#718484", fontFamily: "var(--font-mono)", background: "rgba(52,193,193,0.1)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(52,193,193,0.25)" }}>
              v0.1 Live System
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/docs"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            Debug_Vitals Doc
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Hero Section */}
        <div style={{ marginBottom: 56, textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 20,
            background: "rgba(52, 193, 193, 0.12)", border: "1px solid rgba(52, 193, 193, 0.3)",
            fontSize: 12, fontWeight: 700, color: "#007777",
            marginBottom: 20, letterSpacing: "0.05em",
          }} className="animate-pulse-glow">
            <span className="dot dot-primary pulse-dot" />
            AI Autonomous Debugging & Diagnostic Layer
          </div>

          <h1 style={{
            fontSize: "clamp(32px, 5.5vw, 54px)",
            fontWeight: 800,
            color: "#1C2222",
            lineHeight: 1.12,
            letterSpacing: "-1px",
            marginBottom: 20,
          }}>
            Diagnose the <span style={{ color: "#34C1C1", textDecoration: "underline decoration-wavy decoration-#34C1C1/40" }}>root cause</span>,<br />not just the surface symptom.
          </h1>

          <p style={{
            fontSize: "clamp(15px, 2vw, 17px)",
            color: "#636e72",
            lineHeight: 1.65,
            maxWidth: 680,
            margin: "0 auto 36px",
          }}>
            AI agents make file changes, upgrade packages, and run terminal commands autonomously. When tests fail, <strong>Debug Vitals traces the entire causal story</strong> and pinpoints the exact culprit in plain English.
          </p>

          {/* User-friendly Visual Causal Flow */}
          <div style={{
            padding: "24px 28px",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-neo)",
            borderRadius: "var(--radius)",
            maxWidth: 880,
            margin: "0 auto 48px",
            border: "1px solid rgba(255,255,255,0.7)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 16 }}>
              Automated Causal Chain Tracing
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 10,
            }}>
              {[
                { label: "1. AI Agent Action", desc: "Code edit / install", color: "#4B85BE" },
                { label: "2. Env Shift", desc: "Node/Python version", color: "#EC9C13" },
                { label: "3. Dependency Shift", desc: "Package update", color: "#EC9C13" },
                { label: "4. Test Failure", desc: "Failed assertion", color: "#DB2424" },
                { label: "5. Diagnosis", desc: "Root Cause Output", color: "#2BAB60" },
              ].map((step, i, arr) => (
                <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.7)",
                    borderRadius: 10,
                    boxShadow: "var(--shadow-neo-sm)",
                    textAlign: "left",
                    borderLeft: `3px solid ${step.color}`,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1C2222" }}>{step.label}</div>
                    <div style={{ fontSize: 11, color: "#718484", marginTop: 2 }}>{step.desc}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <span style={{ color: "#9AABAB", fontSize: 18, fontWeight: 700 }}>&rarr;</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demo Scenarios Section */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1C2222", marginBottom: 4 }}>
                Explore Live Demo Investigations
              </h2>
              <p style={{ fontSize: 14, color: "#718484" }}>
                Select a scenario below to see how Debug Vitals diagnoses complex multi-step failures instantly.
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#34C1C1", background: "rgba(52,193,193,0.1)", padding: "4px 12px", borderRadius: 12 }}>
              Instant Demo — No Configuration Needed
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {scenarios.map((s) => (
              <Link
                key={s.id}
                href={`/session/demo-${s.id}`}
                style={{ textDecoration: "none" }}
              >
                <div className="glass-card" style={{
                  padding: "24px 28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 24,
                  flexWrap: "wrap",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flex: 1, minWidth: 280 }}>
                    <div style={{
                      marginTop: 4,
                      width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                      background: SCENARIO_COLORS[s.id] || "#34C1C1",
                      boxShadow: `0 0 10px ${SCENARIO_COLORS[s.id] || "#34C1C1"}`,
                    }} />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1C2222", marginBottom: 6 }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: 13, color: "#636e72", lineHeight: 1.5, marginBottom: 10 }}>
                        {s.description}
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#007777", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                          Root cause: {s.rootCause.slice(0, 75)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4
                    }}>
                      <span className="badge badge-error">
                        <span className="dot dot-error" />
                        {s.testSummary.failed} Test Failures
                      </span>
                      <span style={{ fontSize: 11, color: "#9AABAB" }}>
                        {s.testSummary.total} total tests executed
                      </span>
                    </div>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "rgba(52, 193, 193, 0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#34C1C1", fontWeight: 700, fontSize: 16,
                    }}>
                      &rarr;
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 5-Step Plain-English Workflow Breakdown */}
        <div style={{
          padding: "36px 32px",
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-neo)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(255,255,255,0.7)",
        }}>
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1C2222", marginBottom: 6 }}>
              Simple 5-Step Guided Workflow
            </h2>
            <p style={{ fontSize: 13, color: "#718484" }}>
              How Debug Vitals guides developers from initial failure detection to automated fix verification.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { n: "01", title: "Project Checkup", desc: "Scans project runtime, installed packages, and active failures for any mismatches." },
              { n: "02", title: "Root Cause Diagnosis", desc: "Calculates exact cause probabilities and presents evidence in plain English." },
              { n: "03", title: "Action Timeline", desc: "Provides an easy-to-read chronological log of every file edit, terminal run, and test." },
              { n: "04", title: "Sandbox Verification", desc: "Reruns your code in an isolated Docker container to verify the exact fix hypothesis." },
              { n: "05", title: "Regression Guard", desc: "Auto-generates a targeted test to permanently lock in the fix and prevent future bugs." },
            ].map((step) => (
              <div key={step.n} style={{
                padding: "20px 18px",
                background: "rgba(255,255,255,0.6)",
                boxShadow: "var(--shadow-neo-sm)",
                borderRadius: "var(--radius-sm)",
                borderTop: "3px solid #34C1C1",
              }}>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12, fontWeight: 800, color: "#34C1C1", marginBottom: 8,
                }}>
                  STEP {step.n}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1C2222", marginBottom: 6 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 12, color: "#636e72", lineHeight: 1.55 }}>
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
