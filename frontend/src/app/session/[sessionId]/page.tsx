"use client";

import { use } from "react";
import { DEMO_SCENARIOS, DEFAULT_SCENARIO_ID, type ScenarioId } from "@/lib/demoData";

export default function CheckupPage({
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

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <span className="t-section" style={{ display: "block", marginBottom: 10 }}>Overview</span>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#EDEAE2", margin: "0 0 6px" }}>
          Project Checkup
        </h1>
        <p style={{ fontSize: 13, color: "#8A8880", margin: 0 }}>
          Case{" "}
          <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 11, color: "#C8963E" }}>
            #{sessionId.slice(0, 4).toUpperCase()}
          </span>
          {" "}· {scenario.failureTitle}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Runtime */}
        <Section label="Runtime" state={env.runtime.ok ? "ok" : "fail"}>
          <div style={{ display: "flex", gap: 32 }}>
            <Field label={env.runtime.label} value={env.runtime.actual} error={!env.runtime.ok} />
            {!env.runtime.ok && (
              <Field label="Expected" value={env.runtime.expected} dim />
            )}
          </div>
          {!env.runtime.ok && (
            <div style={{
              marginTop: 10,
              padding: "6px 10px",
              background: "rgba(224,82,82,0.06)",
              border: "1px solid rgba(224,82,82,0.15)",
              borderRadius: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}>
              <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#E05252" }}>✕ mismatch</span>
              <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#4E4E48" }}>
                expected {env.runtime.expected}, found {env.runtime.actual}
              </span>
            </div>
          )}
        </Section>

        {/* Dependencies */}
        <Section label="Dependencies" state="ok">
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {env.dependencies.map((dep, i) => (
              <div key={dep.name} style={{
                display: "flex",
                alignItems: "baseline",
                gap: 16,
                padding: "7px 0",
                borderTop: i > 0 ? "1px solid #242422" : "none",
              }}>
                <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 12, color: "#8A8880", width: 110, flexShrink: 0 }}>
                  {dep.name}
                </span>
                <span style={{ fontFamily: "var(--font-jb-mono), monospace", fontSize: 12, color: dep.ok ? "#EDEAE2" : "#E05252" }}>
                  {dep.actual}
                </span>
                {dep.ok
                  ? <span style={{ marginLeft: "auto", fontFamily: "var(--font-jb-mono), monospace", fontSize: 10, color: "#5E9E6E" }}>✓</span>
                  : <span style={{ marginLeft: "auto", fontFamily: "var(--font-jb-mono), monospace", fontSize: 11, color: "#4E4E48" }}>
                      expected {dep.expected}
                    </span>
                }
              </div>
            ))}
          </div>
        </Section>

        {/* Services */}
        <Section label="Connected Services" state="ok">
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {env.services.map((svc, i) => (
              <div key={svc.name} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "7px 0",
                borderTop: i > 0 ? "1px solid #242422" : "none",
              }}>
                <span style={{ fontSize: 13, color: "#EDEAE2", width: 120, flexShrink: 0 }}>{svc.name}</span>
                <span className={[
                  "live-dot",
                  svc.status === "up" ? "" : "live-dot--fail",
                ].join(" ")} />
                <span style={{
                  fontFamily: "var(--font-jb-mono), monospace",
                  fontSize: 11,
                  color: svc.status === "up" ? "#5E9E6E" : "#E05252",
                }}>{svc.status}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* CI */}
        <Section label="CI" state={env.ci.status === "passing" ? "ok" : "fail"}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 13, color: "#EDEAE2" }}>{env.ci.name}</span>
            <span className={`badge ${env.ci.status === "passing" ? "badge-success" : env.ci.status === "failing" ? "badge-failure" : "badge-warning"}`}>
              {env.ci.status}
            </span>
          </div>
        </Section>

        {/* Current investigation */}
        <Section label="Current Investigation" state="warn">
          <p style={{ fontSize: 14, fontWeight: 500, color: "#EDEAE2", margin: "0 0 6px" }}>
            {scenario.failureTitle}
          </p>
          <p style={{ fontSize: 13, color: "#8A8880", margin: 0, lineHeight: 1.6 }}>
            {scenario.shortDescription}
          </p>
        </Section>

      </div>
    </main>
  );
}

function Section({
  label, state, children
}: {
  label: string;
  state: "ok" | "fail" | "warn";
  children: React.ReactNode;
}) {
  const stateStyle = {
    ok:   { border: "1px solid #2E2E2A",            bg: "#161614" },
    fail: { border: "1px solid rgba(224,82,82,0.22)", bg: "rgba(224,82,82,0.04)" },
    warn: { border: "1px solid rgba(214,168,79,0.2)", bg: "rgba(214,168,79,0.04)" },
  }[state];

  return (
    <div style={{
      background: stateStyle.bg,
      border: stateStyle.border,
      borderRadius: 6,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "9px 16px 8px",
        borderBottom: "1px solid #242422",
        background: "#0E0E0C",
        opacity: 0.9,
      }}>
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4E4E48" }}>
          {label}
        </span>
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

function Field({ label, value, error, dim }: {
  label: string; value: string; error?: boolean; dim?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, color: "#4E4E48" }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-jb-mono), monospace",
        fontSize: 13,
        color: error ? "#E05252" : dim ? "#8A8880" : "#EDEAE2",
      }}>{value}</span>
    </div>
  );
}
