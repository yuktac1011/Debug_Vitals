"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_SCENARIOS, type ScenarioId } from "@/lib/demoData";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
type BackendState = "checking" | "ok" | "error";

const SCENARIO_COLORS: Record<ScenarioId, string> = {
  "node-runtime-mismatch": "linear-gradient(135deg, rgba(52,193,193,0.12), rgba(75,133,190,0.12))",
  "dependency-conflict":   "linear-gradient(135deg, rgba(75,133,190,0.12), rgba(70,210,140,0.12))",
  "env-var-missing":       "linear-gradient(135deg, rgba(70,210,140,0.12), rgba(52,193,193,0.12))",
};

export default function HomePage() {
  const router = useRouter();
  const [backend, setBackend] = useState<BackendState>("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const [launching, setLaunching] = useState<ScenarioId | null>(null);
  const [hovered, setHovered] = useState<ScenarioId | null>(null);

  useEffect(() => {
    const t0 = Date.now();
    fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(5000) })
      .then((r) => { if (r.ok) { setBackend("ok"); setLatency(Date.now() - t0); } else setBackend("error"); })
      .catch(() => setBackend("error"));
  }, []);

  async function launch(id: ScenarioId) {
    setLaunching(id);
    try {
      const res = await fetch(`${BACKEND_URL}/demo/${id}`, { method: "POST" });
      if (res.ok) {
        const { session_id } = await res.json() as { session_id: string };
        router.push(`/session/${session_id}/diagnosis`); return;
      }
    } catch { /* fall through */ }
    router.push(`/session/demo-${id}/diagnosis`);
  }

  const scenarios = Object.values(DEMO_SCENARIOS);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#F9FBFB" }}>

      {/* ── Header ── */}
      <header style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #D8E4E4",
        boxShadow: "0 2px 12px rgba(166,190,190,0.18)",
        padding: "0 clamp(16px, 4vw, 40px)",
        height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(135deg, #34C1C1, #4B85BE)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#fff", fontWeight: 700,
            boxShadow: "2px 2px 8px rgba(52,193,193,0.4), -1px -1px 4px rgba(255,255,255,0.7)",
          }}>⊕</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2222", letterSpacing: "-0.01em" }}>AgentDoctor</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`live-dot ${backend === "ok" ? "" : backend === "checking" ? "live-dot--warn" : "live-dot--fail"}`} />
          <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 11, color: "#9AABAB" }}>
            {backend === "ok" ? `${latency ?? "…"}ms` : backend === "checking" ? "checking…" : "offline"}
          </span>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* ── Hero ── */}
        <section style={{
          padding: "clamp(40px,8vh,80px) clamp(16px,5vw,40px) clamp(32px,6vh,64px)",
          maxWidth: 700, margin: "0 auto", width: "100%",
          textAlign: "center",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
            background: "rgba(52,193,193,0.08)", border: "1px solid rgba(52,193,193,0.2)",
            borderRadius: 20, padding: "4px 14px",
            boxShadow: "1px 1px 4px rgba(166,190,190,0.25), -1px -1px 3px rgba(255,255,255,0.8)",
          }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#34C1C1", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              AI Diagnostic Tool
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(26px,5vw,42px)", fontWeight: 700, color: "#1C2222", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 16 }}>
            Diagnose the cause,{" "}
            <span style={{ color: "#34C1C1" }}>not just the symptom.</span>
          </h1>
          <p style={{ fontSize: "clamp(14px,2vw,16px)", lineHeight: 1.7, color: "#718484", maxWidth: 520, margin: "0 auto 32px" }}>
            AgentDoctor traces agent actions through code changes, environment state,
            and CI failures — building the causal chain that shows exactly what broke and why.
          </p>

          {/* CTA stats row */}
          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(20px,4vw,40px)", flexWrap: "wrap" }}>
            {[
              { n: "< 30s", l: "to diagnosis" },
              { n: "100%", l: "evidence-backed" },
              { n: "1-click", l: "verification" },
            ].map(({ n, l }) => (
              <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#34C1C1" }}>{n}</span>
                <span style={{ fontSize: 11, color: "#718484" }}>{l}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Demo scenario cards ── */}
        <section style={{
          padding: "0 clamp(16px,5vw,40px) clamp(40px,6vh,80px)",
          maxWidth: 820, margin: "0 auto", width: "100%",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AABAB" }}>
              Demo Scenarios
            </h2>
            <div style={{ flex: 1, height: 1, background: "#D8E4E4" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {scenarios.map((s) => {
              const isLaunching = launching === s.id;
              const isHovered = hovered === s.id;
              return (
                <button
                  key={s.id}
                  disabled={launching !== null}
                  onClick={() => launch(s.id)}
                  onMouseEnter={() => setHovered(s.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: isHovered ? "#FFFFFF" : SCENARIO_COLORS[s.id],
                    border: `1px solid ${isHovered ? "#B8CCCC" : "#D8E4E4"}`,
                    borderRadius: 12,
                    padding: "20px 18px",
                    textAlign: "left",
                    cursor: launching ? "not-allowed" : "pointer",
                    opacity: launching && !isLaunching ? 0.55 : 1,
                    transition: "all 0.18s ease",
                    boxShadow: isHovered
                      ? "4px 4px 14px rgba(166,190,190,0.4), -2px -2px 8px rgba(255,255,255,0.9)"
                      : "2px 2px 8px rgba(166,190,190,0.25), -1px -1px 4px rgba(255,255,255,0.7)",
                    transform: isHovered ? "translateY(-2px)" : "none",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#34C1C1" }}>
                      {isLaunching ? "Launching…" : "Run scenario"}
                    </span>
                    <span style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: isLaunching ? "#34C1C1" : "rgba(52,193,193,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14,
                      boxShadow: isLaunching ? "2px 2px 6px rgba(52,193,193,0.4)" : "none",
                      transition: "all 0.15s",
                    }}>
                      {isLaunching ? <span className="live-dot" style={{ width: 7, height: 7 }} /> : "→"}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1C2222", marginBottom: 6 }}>{s.label}</p>
                    <p style={{ fontSize: 12, color: "#718484", lineHeight: 1.55 }}>{s.shortDescription}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <p style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 11, color: "#9AABAB", marginTop: 12, textAlign: "center" }}>
            No repository or account needed
          </p>
        </section>

        {/* ── Workflow steps ── */}
        <section style={{
          padding: "0 clamp(16px,5vw,40px) clamp(48px,8vh,96px)",
          maxWidth: 820, margin: "0 auto", width: "100%",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AABAB" }}>
              How It Works
            </h2>
            <div style={{ flex: 1, height: 1, background: "#D8E4E4" }} />
          </div>

          <div style={{
            background: "#FFFFFF",
            borderRadius: 12,
            border: "1px solid #D8E4E4",
            boxShadow: "var(--neo-card)",
            overflow: "hidden",
          }}>
            {[
              { n: "01", t: "Checkup",         d: "Runtime, dependencies, services, CI snapshot.", c: "#34C1C1" },
              { n: "02", t: "Failure",          d: "A test or build failure is detected.",          c: "#DB2424" },
              { n: "03", t: "Timeline",         d: "Every event is sequenced chronologically.",     c: "#4B85BE" },
              { n: "04", t: "Diagnosis",        d: "Causal chain maps agent action to CI failure.", c: "#34C1C1" },
              { n: "05", t: "Verification",     d: "Hypothesis tested in an isolated container.",   c: "#2BAB60" },
              { n: "06", t: "Regression Guard", d: "One targeted test generated for this failure.", c: "#46D28C" },
            ].map(({ n, t, d, c }, i) => (
              <div key={n} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "13px 20px",
                borderTop: i > 0 ? "1px solid #E8F0F0" : "none",
              }}>
                <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#9AABAB", width: 20, flexShrink: 0 }}>{n}</span>
                <span style={{ width: 4, height: 32, borderRadius: 2, background: c, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1C2222", width: 130, flexShrink: 0 }}>{t}</span>
                <span style={{ fontSize: 13, color: "#718484", lineHeight: 1.5 }}>{d}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
