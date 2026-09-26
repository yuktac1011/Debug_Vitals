"use client";

import { use } from "react";
import { DEMO_SCENARIOS, DEFAULT_SCENARIO_ID, type ScenarioId } from "@/lib/demoData";

export default function EnvironmentPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const scenarioId = sessionId.replace("demo-", "") as ScenarioId;
  const scenario = DEMO_SCENARIOS[scenarioId] ?? DEMO_SCENARIOS[DEFAULT_SCENARIO_ID];
  const env = scenario.environment;

  return (
    <main style={{ flex: 1, padding: "32px 40px 60px", maxWidth: 680 }}>

      <div style={{ marginBottom: 32 }}>
        <span className="t-section" style={{ display: "block", marginBottom: 8 }}>Environment</span>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#EDEAE2", margin: "0 0 6px" }}>
          Runtime &amp; Dependency Map
        </h1>
        <p style={{ fontSize: 13, color: "#8A8880", margin: 0 }}>
          Expected vs actual state — mismatches labeled inline.
        </p>
      </div>

      {/* Chain diagram */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

        {/* Runtime */}
        <EnvNode
          label="Runtime"
          name={env.runtime.label}
          actual={env.runtime.actual}
          expected={env.runtime.ok ? undefined : env.runtime.expected}
          ok={env.runtime.ok}
        />

        <ChainConnector />

        {/* Dependencies */}
        <div style={{
          background: "#161614",
          border: "1px solid #2E2E2A",
          borderRadius: 6,
          overflow: "hidden",
        }}>
          <div style={{ padding: "10px 16px 8px", borderBottom: "1px solid #242422" }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4E4E48" }}>
              Dependencies
            </span>
          </div>
          {env.dependencies.map((dep, i) => (
            <div
              key={dep.name}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 16,
                padding: "9px 16px",
                borderTop: i > 0 ? "1px solid #242422" : "none",
                background: dep.ok ? "transparent" : "rgba(224,82,82,0.04)",
              }}
            >
              <span style={{
                fontFamily: "var(--font-jb-mono), monospace",
                fontSize: 12, color: "#8A8880", width: 120, flexShrink: 0,
              }}>{dep.name}</span>
              <span style={{
                fontFamily: "var(--font-jb-mono), monospace",
                fontSize: 12,
                color: dep.ok ? "#EDEAE2" : "#E05252",
              }}>{dep.actual}</span>
              {dep.ok
                ? <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#5E9E6E", marginLeft: "auto" }}>✓</span>
                : <span style={{
                    fontFamily: "var(--font-jb-mono), monospace",
                    fontSize: 11, color: "#4E4E48", marginLeft: "auto",
                  }}>expected {dep.expected}</span>
              }
            </div>
          ))}
        </div>

        <ChainConnector />

        {/* Services */}
        <div style={{
          background: "#161614",
          border: "1px solid #2E2E2A",
          borderRadius: 6,
          overflow: "hidden",
        }}>
          <div style={{ padding: "10px 16px 8px", borderBottom: "1px solid #242422" }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4E4E48" }}>
              Connected Services
            </span>
          </div>
          {env.services.map((svc, i) => (
            <div
              key={svc.name}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 16,
                padding: "9px 16px",
                borderTop: i > 0 ? "1px solid #242422" : "none",
                background: svc.status === "down" ? "rgba(224,82,82,0.04)" : "transparent",
              }}
            >
              <span style={{ fontSize: 13, color: "#EDEAE2", width: 120, flexShrink: 0 }}>{svc.name}</span>
              <span style={{
                fontFamily: "var(--font-jb-mono), monospace",
                fontSize: 11,
                color: svc.status === "up" ? "#5E9E6E" : svc.status === "down" ? "#E05252" : "#8A8880",
              }}>{svc.status}</span>
            </div>
          ))}
        </div>

        <ChainConnector />

        {/* CI */}
        <EnvNode
          label="CI"
          name={env.ci.name}
          actual={env.ci.status}
          ok={env.ci.status === "passing"}
        />
      </div>

      {/* Mismatch callout */}
      {!env.runtime.ok && (
        <div style={{
          marginTop: 28,
          background: "rgba(224,82,82,0.05)",
          border: "1px solid rgba(224,82,82,0.2)",
          borderRadius: 6,
          padding: "14px 18px",
        }}>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#E05252", display: "block", marginBottom: 8 }}>
            Identified Mismatch
          </span>
          <p style={{ fontSize: 13, color: "#8A8880", margin: 0, lineHeight: 1.6 }}>
            {env.runtime.label}: expected{" "}
            <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 12, color: "#EDEAE2" }}>
              {env.runtime.expected}
            </span>
            , found{" "}
            <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 12, color: "#E05252" }}>
              {env.runtime.actual}
            </span>
            . This is the root cause of the CI failure.
          </p>
        </div>
      )}
    </main>
  );
}

function EnvNode({ label, name, actual, expected, ok }: {
  label: string; name: string; actual: string; expected?: string; ok: boolean;
}) {
  return (
    <div style={{
      background: ok ? "#161614" : "rgba(224,82,82,0.05)",
      border: ok ? "1px solid #2E2E2A" : "1px solid rgba(224,82,82,0.22)",
      borderRadius: 6,
      padding: "14px 18px",
    }}>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4E4E48", display: "block", marginBottom: 6 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 500, color: "#EDEAE2", display: "block", marginBottom: 4 }}>{name}</span>
      <span style={{
        fontFamily: "var(--font-jb-mono), monospace",
        fontSize: 12,
        color: ok ? "#EDEAE2" : "#E05252",
      }}>{actual}</span>
      {expected && (
        <span style={{
          fontFamily: "var(--font-jb-mono), monospace",
          fontSize: 11, color: "#4E4E48",
          display: "block", marginTop: 4,
        }}>Expected: {expected}</span>
      )}
    </div>
  );
}

function ChainConnector() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      paddingLeft: 24,
      gap: 0,
    }} aria-hidden>
      <div style={{ width: 1, height: 16, background: "#2E2E2A" }} />
      <div style={{ width: 1, height: 4, background: "#3A3A36" }} />
    </div>
  );
}
