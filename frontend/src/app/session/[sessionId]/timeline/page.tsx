"use client";

import { use, useState } from "react";
import { DEMO_SCENARIOS, DEFAULT_SCENARIO_ID, type ScenarioId } from "@/lib/demoData";

const KIND_STYLE: Record<string, { color: string; bg: string }> = {
  "AGENT ACTION": { color: "#D6A84F", bg: "rgba(214,168,79,0.08)"  },
  "TEST":         { color: "#E05252", bg: "rgba(224,82,82,0.06)"   },
  "ENVIRONMENT":  { color: "#8A8880", bg: "rgba(138,136,128,0.06)" },
  "COMMAND":      { color: "#8A8880", bg: "rgba(138,136,128,0.06)" },
  "CI":           { color: "#E05252", bg: "rgba(224,82,82,0.06)"   },
};

export default function TimelinePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [expanded, setExpanded] = useState<string | null>(null);

  const scenarioId = sessionId.replace("demo-", "") as ScenarioId;
  const scenario = DEMO_SCENARIOS[scenarioId] ?? DEMO_SCENARIOS[DEFAULT_SCENARIO_ID];

  const relevantCount = scenario.timeline.filter((e) => e.relevant).length;

  return (
    <main style={{ flex: 1, padding: "32px 40px 60px", maxWidth: 820 }}>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 28,
      }}>
        <div>
          <span className="t-section" style={{ display: "block", marginBottom: 8 }}>Timeline</span>
          <p style={{ fontSize: 13, color: "#8A8880", margin: 0 }}>
            {scenario.timeline.length} events captured ·{" "}
            <span style={{ color: "#E05252" }}>{relevantCount} relevant to this diagnosis</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 2, background: "#E05252", borderRadius: 1 }} />
            <span style={{ fontSize: 11, color: "#8A8880", fontFamily: "var(--font-jb-mono), monospace" }}>relevant</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 2, background: "#2E2E2A", borderRadius: 1 }} />
            <span style={{ fontSize: 11, color: "#4E4E48", fontFamily: "var(--font-jb-mono), monospace" }}>other</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        background: "#161614",
        border: "1px solid #2E2E2A",
        borderRadius: 6,
        overflow: "hidden",
      }}>
        {scenario.timeline.map((event, i) => {
          const isExpanded = expanded === event.id;
          const ks = KIND_STYLE[event.kind] ?? KIND_STYLE["ENVIRONMENT"];

          return (
            <div
              key={event.id}
              style={{
                borderTop: i > 0 ? "1px solid #242422" : "none",
                borderLeft: event.relevant ? "3px solid #E05252" : "3px solid transparent",
                background: event.relevant
                  ? (isExpanded ? "rgba(224,82,82,0.07)" : "rgba(224,82,82,0.03)")
                  : (isExpanded ? "#1C1C19" : "transparent"),
                opacity: event.relevant ? 1 : 0.45,
                transition: "background 0.12s",
                cursor: event.detail ? "pointer" : "default",
              }}
              onClick={() =>
                event.detail && setExpanded(isExpanded ? null : event.id)
              }
              onMouseEnter={(e) => {
                if (!isExpanded)
                  (e.currentTarget as HTMLElement).style.background =
                    event.relevant ? "rgba(224,82,82,0.06)" : "#1C1C19";
              }}
              onMouseLeave={(e) => {
                if (!isExpanded)
                  (e.currentTarget as HTMLElement).style.background =
                    event.relevant
                      ? "rgba(224,82,82,0.03)"
                      : "transparent";
              }}
            >
              {/* Main row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "80px 110px 1fr 14px",
                gap: "0 14px",
                alignItems: "baseline",
                padding: "10px 16px",
              }}>
                {/* Timestamp */}
                <span style={{
                  fontFamily: "var(--font-jb-mono), monospace",
                  fontSize: 11, color: "#4E4E48",
                }}>
                  {event.time}
                </span>

                {/* Kind badge */}
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "var(--font-jb-mono), monospace",
                  fontSize: 10,
                  fontWeight: 500,
                  color: event.relevant ? ks.color : "#4E4E48",
                  background: event.relevant ? ks.bg : "transparent",
                  padding: event.relevant ? "1px 6px" : "1px 0",
                  borderRadius: 3,
                  letterSpacing: "0.04em",
                }}>
                  {event.marker} {event.kind}
                </span>

                {/* Description */}
                <span style={{
                  fontSize: 13,
                  color: event.relevant ? "#EDEAE2" : "#8A8880",
                  lineHeight: 1.4,
                }}>
                  {event.description}
                </span>

                {/* Expand hint */}
                {event.detail && (
                  <span style={{
                    fontFamily: "var(--font-jb-mono), monospace",
                    fontSize: 10,
                    color: "#4E4E48",
                    justifySelf: "end",
                  }}>
                    {isExpanded ? "−" : "+"}
                  </span>
                )}
              </div>

              {/* Expanded detail */}
              {isExpanded && event.detail && (
                <div style={{ padding: "0 16px 14px" }} onClick={(e) => e.stopPropagation()}>
                  <pre style={{
                    fontFamily: "var(--font-jb-mono), monospace",
                    fontSize: 11,
                    lineHeight: 1.7,
                    color: "#8A8880",
                    background: "#0E0E0C",
                    border: "1px solid #2E2E2A",
                    borderRadius: 4,
                    padding: "12px 14px",
                    overflowX: "auto",
                    margin: 0,
                  }}>
                    {event.detail}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
