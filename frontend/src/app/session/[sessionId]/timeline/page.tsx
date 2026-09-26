"use client"

import { use, useState } from "react"
import { DEMO_SCENARIOS, DEFAULT_SCENARIO, type ScenarioId, type TimelineEvent } from "@/lib/demoData"

const KIND_COLOR: Record<TimelineEvent["kind"], string> = {
  AGENT: "#4B85BE",
  GIT:   "#718484",
  ENV:   "#34C1C1",
  TEST:  "#EC9C13",
  CI:    "#DB2424",
  DEP:   "#EC9C13",
}

const KIND_LABEL: Record<TimelineEvent["kind"], string> = {
  AGENT: "AGENT",
  GIT:   "GIT",
  ENV:   "ENV",
  TEST:  "TEST",
  CI:    "CI",
  DEP:   "DEP",
}

export default function TimelinePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const scenarioId    = sessionId.replace("demo-", "") as ScenarioId
  const s             = DEMO_SCENARIOS[scenarioId] ?? DEMO_SCENARIOS[DEFAULT_SCENARIO]
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAll,  setShowAll]  = useState(false)

  const events  = showAll ? s.timeline : s.timeline.filter((e) => e.relevant)
  const relevant = s.timeline.filter((e) => e.relevant).length

  return (
    <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 860 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AABAB", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          03 / Timeline
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C2222", letterSpacing: "-0.3px", marginBottom: 6 }}>
          Investigation log
        </h1>
        <p style={{ fontSize: 13, color: "#718484" }}>
          {s.timeline.length} events captured &mdash; <span style={{ color: "#DB2424" }}>{relevant} relevant to this failure</span>
        </p>
      </div>

      {/* Filter toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          className="btn btn-sm"
          style={{
            background: !showAll ? "#1C2222" : "#fff",
            color:      !showAll ? "#fff"    : "#718484",
            border:     `1px solid ${!showAll ? "#1C2222" : "#D8E4E4"}`,
          }}
          onClick={() => setShowAll(false)}
        >
          Relevant only ({relevant})
        </button>
        <button
          className="btn btn-sm"
          style={{
            background: showAll ? "#1C2222" : "#fff",
            color:      showAll ? "#fff"    : "#718484",
            border:     `1px solid ${showAll ? "#1C2222" : "#D8E4E4"}`,
          }}
          onClick={() => setShowAll(true)}
        >
          All events ({s.timeline.length})
        </button>
        {/* Legend */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 14, flexWrap: "wrap" }}>
          {(Object.entries(KIND_COLOR) as [TimelineEvent["kind"], string][]).map(([kind, color]) => (
            <span key={kind} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-mono-jb), monospace", color: "#9AABAB" }}>{kind}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: "relative" }}>
        {/* Vertical track */}
        <div style={{
          position: "absolute",
          left: 95,
          top: 0, bottom: 0,
          width: 1,
          background: "#EBF2F2",
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {events.map((ev) => {
            const isExpanded = expanded === ev.id
            return (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  gap: 0,
                  opacity: ev.relevant ? 1 : 0.45,
                }}
              >
                {/* Timestamp */}
                <div style={{
                  width: 88,
                  flexShrink: 0,
                  padding: "14px 12px 14px 0",
                  textAlign: "right",
                  fontFamily: "var(--font-mono-jb), monospace",
                  fontSize: 11,
                  color: "#9AABAB",
                  lineHeight: 1.4,
                }}>
                  {ev.time}
                </div>

                {/* Dot on track */}
                <div style={{ width: 16, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ marginTop: 18, width: 7, height: 7, borderRadius: "50%", background: KIND_COLOR[ev.kind], border: `2px solid #F9FBFB`, flexShrink: 0 }} />
                </div>

                {/* Content */}
                <div
                  style={{
                    flex: 1,
                    padding: "10px 0 10px 16px",
                    borderBottom: "1px solid #EBF2F2",
                    cursor: ev.detail ? "pointer" : "default",
                  }}
                  onClick={() => ev.detail && setExpanded(isExpanded ? null : ev.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Kind badge */}
                    <span style={{
                      fontFamily: "var(--font-mono-jb), monospace",
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
                      color: KIND_COLOR[ev.kind],
                      minWidth: 36,
                    }}>
                      {KIND_LABEL[ev.kind]}
                    </span>
                    {/* Status dot */}
                    {ev.status !== "info" && (
                      <span style={{
                        width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                        background: ev.status === "fail" ? "#DB2424" : ev.status === "warn" ? "#EC9C13" : "#2BAB60",
                        display: "inline-block",
                      }} />
                    )}
                    {/* Title */}
                    <span style={{ fontSize: 13, color: "#1C2222", lineHeight: 1.4 }}>
                      {ev.title}
                    </span>
                    {/* Expand hint */}
                    {ev.detail && (
                      <span style={{ marginLeft: "auto", fontSize: 12, color: "#9AABAB" }}>
                        {isExpanded ? "−" : "+"}
                      </span>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && ev.detail && (
                    <pre style={{
                      marginTop: 10,
                      fontFamily: "var(--font-mono-jb), monospace",
                      fontSize: 11,
                      lineHeight: 1.7,
                      color: "#718484",
                      background: "#F2F6F6",
                      border: "1px solid #D8E4E4",
                      borderRadius: 4,
                      padding: "10px 12px",
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                    }}>
                      {ev.detail}
                    </pre>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
