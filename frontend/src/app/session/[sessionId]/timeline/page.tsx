"use client"

import { use, useState } from "react"
import { useSession } from "@/lib/useSession"
import type { TimelineEvent } from "@/lib/demoData"
import type { TimelineEventItem, EventType } from "@/lib/api"

// ── Colour maps ───────────────────────────────────────────────────────────────

const KIND_COLOR: Record<string, string> = {
  AGENT:        "#4B85BE",
  GIT:          "#718484",
  ENV:          "#34C1C1",
  TEST:         "#EC9C13",
  CI:           "#DB2424",
  DEP:          "#EC9C13",
  agent_action: "#4B85BE",
  git_diff:     "#718484",
  env_snapshot: "#34C1C1",
  test_result:  "#EC9C13",
  ci_result:    "#DB2424",
  dependency:   "#EC9C13",
  custom:       "#9AABAB",
}

const KIND_LABEL: Record<string, string> = {
  AGENT:        "AGENT",
  GIT:          "GIT DIFF",
  ENV:          "ENV SHIFT",
  TEST:         "TEST RUN",
  CI:           "CI CD",
  DEP:          "PACKAGE",
  agent_action: "AGENT ACTION",
  git_diff:     "GIT DIFF",
  env_snapshot: "ENV SNAPSHOT",
  test_result:  "TEST RESULT",
  ci_result:    "CI OUTCOME",
  dependency:   "PACKAGE DEP",
  custom:       "SIGNAL",
}

const SEVERITY_COLOR: Record<string, string> = {
  debug:    "#9AABAB",
  info:     "#9AABAB",
  warning:  "#EC9C13",
  error:    "#DB2424",
  critical: "#DB2424",
}

const EVENT_TYPE_OPTIONS: { value: EventType | ""; label: string }[] = [
  { value: "",             label: "All Event Types" },
  { value: "agent_action", label: "AI Agent Actions" },
  { value: "git_diff",     label: "Git Code Diffs" },
  { value: "env_snapshot", label: "Environment Shifts" },
  { value: "test_result",  label: "Test Executions" },
  { value: "ci_result",    label: "CI/CD Outcomes" },
  { value: "dependency",   label: "Package Updates" },
  { value: "custom",       label: "Custom Signals" },
]

// ── Demo row adapter ──────────────────────────────────────────────────────────

function DemoTimeline({ events }: { events: TimelineEvent[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAll,  setShowAll]  = useState(false)

  const relevant = events.filter((e) => e.relevant).length
  const shown    = showAll ? events : events.filter((e) => e.relevant)

  return (
    <>
      {/* Filter toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          className={`btn btn-sm ${!showAll ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setShowAll(false)}
        >
          Relevant to Failure ({relevant})
        </button>
        <button
          className={`btn btn-sm ${showAll ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setShowAll(true)}
        >
          All System Events ({events.length})
        </button>
        <Legend />
      </div>

      <TimelineTrack>
        {shown.map((ev) => {
          const isExp = expanded === ev.id
          return (
            <TrackRow
              key={ev.id}
              time={ev.time}
              kindKey={ev.kind}
              title={ev.title}
              detail={ev.detail}
              dimmed={!ev.relevant}
              statusDot={ev.status !== "info" ? ev.status : undefined}
              expanded={isExp}
              onToggle={() => ev.detail && setExpanded(isExp ? null : ev.id)}
            />
          )
        })}
      </TimelineTrack>
    </>
  )
}

// ── Live row adapter ──────────────────────────────────────────────────────────

function LiveTimeline({
  events,
  loading,
  onRefetch,
}: {
  events: TimelineEventItem[]
  loading: boolean
  onRefetch: (eventType?: string) => void
}) {
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [filterType, setFilterType] = useState<EventType | "">("")

  function handleFilter(val: EventType | "") {
    setFilterType(val)
    onRefetch(val || undefined)
  }

  return (
    <>
      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select
          value={filterType}
          onChange={(e) => handleFilter(e.target.value as EventType | "")}
          style={{
            fontSize: 13, padding: "6px 12px", border: "1px solid #c4c9cf",
            borderRadius: 6, background: "#fff", color: "#1C2222",
            fontFamily: "var(--font-mono)", fontWeight: 500, outline: "none",
          }}
        >
          {EVENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onRefetch(filterType || undefined)}
          disabled={loading}
        >
          {loading ? "Refreshing Log…" : "Refresh Timeline"}
        </button>
        <Legend />
      </div>

      {events.length === 0 && !loading && (
        <div style={{ padding: "40px 20px", color: "#718484", fontSize: 13, textAlign: "center" }} className="glass-card">
          No events recorded for this filter. Send signals via <code>POST /api/v1/events</code>.
        </div>
      )}

      <TimelineTrack>
        {events.map((ev) => {
          const isExp = expanded === ev.id
          const payloadStr = ev.payload ? JSON.stringify(ev.payload, null, 2) : undefined
          const detail = ev.summary
            ? payloadStr ? `${ev.summary}\n\n${payloadStr}` : ev.summary
            : payloadStr
          return (
            <TrackRow
              key={ev.id}
              time={new Date(ev.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              kindKey={ev.event_type}
              title={ev.summary ?? ev.event_type}
              detail={detail}
              severityColor={ev.severity ? SEVERITY_COLOR[ev.severity] : undefined}
              expanded={isExp}
              onToggle={() => detail && setExpanded(isExp ? null : ev.id)}
            />
          )
        })}
      </TimelineTrack>
    </>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{ marginLeft: "auto", display: "flex", gap: 14, flexWrap: "wrap" }}>
      {(["AGENT","GIT","ENV","TEST","CI","DEP"] as const).map((k) => (
        <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: KIND_COLOR[k], display: "inline-block" }} />
          <span style={{ fontFamily: "var(--font-mono)", color: "#718484", fontWeight: 600 }}>{k}</span>
        </span>
      ))}
    </div>
  )
}

function TimelineTrack({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: 100, top: 0, bottom: 0, width: 2, background: "rgba(52, 193, 193, 0.25)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

function TrackRow({
  time, kindKey, title, detail, dimmed, statusDot, severityColor, expanded, onToggle,
}: {
  time: string
  kindKey: string
  title: string
  detail?: string
  dimmed?: boolean
  statusDot?: "ok" | "warn" | "fail"
  severityColor?: string
  expanded: boolean
  onToggle: () => void
}) {
  const dotColor = statusDot === "fail" ? "#DB2424" : statusDot === "warn" ? "#EC9C13" : "#2BAB60"
  return (
    <div style={{ display: "flex", gap: 0, opacity: dimmed ? 0.5 : 1 }} className="animate-float-in">
      {/* Timestamp */}
      <div style={{ width: 92, flexShrink: 0, padding: "12px 14px 12px 0", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11, color: "#718484", fontWeight: 600, lineHeight: 1.4 }}>
        {time}
      </div>
      {/* Dot */}
      <div style={{ width: 18, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ marginTop: 14, width: 10, height: 10, borderRadius: "50%", background: KIND_COLOR[kindKey] ?? "#9AABAB", border: "2px solid #fff", boxShadow: "0 0 6px rgba(0,0,0,0.15)", flexShrink: 0 }} />
      </div>
      {/* Content */}
      <div style={{ flex: 1, marginLeft: 16 }}>
        <div
          className="glass-card"
          style={{
            padding: "12px 16px",
            cursor: detail ? "pointer" : "default",
            borderLeft: `4px solid ${KIND_COLOR[kindKey] ?? "#9AABAB"}`,
          }}
          onClick={onToggle}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", color: KIND_COLOR[kindKey] ?? "#9AABAB", background: "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: 4 }}>
              {KIND_LABEL[kindKey] ?? kindKey.toUpperCase()}
            </span>
            {(statusDot || severityColor) && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: severityColor ?? dotColor, display: "inline-block" }} />
            )}
            <span style={{ fontSize: 13, color: "#1C2222", fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{title}</span>
            {detail && (
              <span style={{ fontSize: 12, color: "#718484", fontWeight: 700 }}>{expanded ? "▲ Hide Payload" : "▼ View Payload"}</span>
            )}
          </div>
          {expanded && detail && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <pre className="code-block" style={{ margin: 0, maxHeight: 280 }}>
                {detail}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ModeBadge({ mode }: { mode: "demo" | "live" }) {
  if (mode === "demo") {
    return (
      <span className="badge badge-primary">
        Interactive Demo
      </span>
    )
  }
  return (
    <span className="badge badge-success">
      Live Session
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TimelinePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const sess          = useSession(sessionId)

  const totalCount  = sess.mode === "demo"
    ? sess.scenario!.timeline.length
    : (sess.timeline?.total_count ?? 0)
  const relevantCount = sess.mode === "demo"
    ? sess.scenario!.timeline.filter((e) => e.relevant).length
    : totalCount

  return (
    <main className="animate-float-in">

      {/* Header */}
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#34C1C1", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
          03 / Chronological Event Log
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1C2222", letterSpacing: "-0.5px" }}>
            Investigation Event Timeline
          </h1>
          <ModeBadge mode={sess.mode} />
        </div>
      </div>

      {/* Non-Technical Callout */}
      <div className="info-callout" style={{ marginBottom: 28 }}>
        <div className="info-callout-icon">i</div>
        <div>
          <strong>What is the Timeline?</strong> AI agents perform multiple file edits and terminal runs before a bug surfaces. The Timeline arranges every action chronologically so you can trace what happened step-by-step.
        </div>
      </div>

      {/* Summary note */}
      <div style={{ fontSize: 13, color: "#718484", marginBottom: 20 }}>
        {sess.mode === "demo"
          ? <>{totalCount} total events logged — <strong style={{ color: "#DB2424" }}>{relevantCount} key events directly linked to this failure</strong></>
          : <>{totalCount} event signal{totalCount !== 1 ? "s" : ""} recorded in this session</>
        }
      </div>

      {/* Mode-specific body */}
      {sess.mode === "demo" ? (
        <DemoTimeline events={sess.scenario!.timeline} />
      ) : (
        <LiveTimeline
          events={sess.timeline?.events ?? []}
          loading={sess.loadingTimeline}
          onRefetch={(eventType) => sess.fetchTimeline({ event_type: eventType, include_payload: true })}
        />
      )}

    </main>
  )
}
