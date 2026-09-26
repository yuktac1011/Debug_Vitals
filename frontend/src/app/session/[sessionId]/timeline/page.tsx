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
  GIT:          "GIT",
  ENV:          "ENV",
  TEST:         "TEST",
  CI:           "CI",
  DEP:          "DEP",
  agent_action: "AGENT",
  git_diff:     "GIT",
  env_snapshot: "ENV",
  test_result:  "TEST",
  ci_result:    "CI",
  dependency:   "DEP",
  custom:       "CUSTOM",
}

const SEVERITY_COLOR: Record<string, string> = {
  debug:    "#9AABAB",
  info:     "#9AABAB",
  warning:  "#EC9C13",
  error:    "#DB2424",
  critical: "#DB2424",
}

const EVENT_TYPE_OPTIONS: { value: EventType | ""; label: string }[] = [
  { value: "",             label: "All types" },
  { value: "agent_action", label: "Agent action" },
  { value: "git_diff",     label: "Git diff" },
  { value: "env_snapshot", label: "Environment" },
  { value: "test_result",  label: "Test result" },
  { value: "ci_result",    label: "CI result" },
  { value: "dependency",   label: "Dependency" },
  { value: "custom",       label: "Custom" },
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
          className="btn btn-sm"
          style={{ background: !showAll ? "#1C2222" : "#fff", color: !showAll ? "#fff" : "#718484", border: `1px solid ${!showAll ? "#1C2222" : "#D8E4E4"}` }}
          onClick={() => setShowAll(false)}
        >Relevant only ({relevant})</button>
        <button
          className="btn btn-sm"
          style={{ background: showAll ? "#1C2222" : "#fff", color: showAll ? "#fff" : "#718484", border: `1px solid ${showAll ? "#1C2222" : "#D8E4E4"}` }}
          onClick={() => setShowAll(true)}
        >All events ({events.length})</button>
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
            fontSize: 12, padding: "5px 10px", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)",
            borderRadius: 4, background: "var(--skeuo-bg)", color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)",
            fontFamily: "var(--font-mono-jb), monospace",
          }}
        >
          {EVENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          className="btn btn-sm"
          onClick={() => onRefetch(filterType || undefined)}
          disabled={loading}
          style={{ opacity: loading ? 0.5 : 1 }}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
        <Legend />
      </div>

      {events.length === 0 && !loading && (
        <div style={{ padding: "32px 0", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", fontSize: 13, textAlign: "center" }}>
          No events found. Ingest events via <code style={{ fontFamily: "var(--font-mono-jb), monospace" }}>POST /api/v1/events</code> to populate the timeline.
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
        <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: KIND_COLOR[k], display: "inline-block" }} className="skeuo-panel" />
          <span style={{ fontFamily: "var(--font-mono-jb), monospace", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)" }}>{k}</span>
        </span>
      ))}
    </div>
  )
}

function TimelineTrack({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: 95, top: 0, bottom: 0, width: 1, background: "#EBF2F2" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
    <div style={{ display: "flex", gap: 0, opacity: dimmed ? 0.45 : 1 }}>
      {/* Timestamp */}
      <div style={{ width: 88, flexShrink: 0, padding: "14px 12px 14px 0", textAlign: "right", fontFamily: "var(--font-mono-jb), monospace", fontSize: 11, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", lineHeight: 1.4 }}>
        {time}
      </div>
      {/* Dot */}
      <div style={{ width: 16, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ marginTop: 18, width: 7, height: 7, borderRadius: "50%", background: KIND_COLOR[kindKey] ?? "#9AABAB", border: "2px solid #F9FBFB", flexShrink: 0 }} />
      </div>
      {/* Content */}
      <div
        style={{ flex: 1, padding: "10px 0 10px 16px", borderBottom: "1px solid var(--skeuo-border)", cursor: detail ? "pointer" : "default" }}
        onClick={onToggle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono-jb), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", color: KIND_COLOR[kindKey] ?? "#9AABAB", minWidth: 36 }}>
            {KIND_LABEL[kindKey] ?? kindKey.toUpperCase().slice(0, 6)}
          </span>
          {(statusDot || severityColor) && (
            <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: severityColor ?? dotColor, display: "inline-block" }} />
          )}
          <span style={{ fontSize: 13, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", lineHeight: 1.4 }}>{title}</span>
          {detail && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)" }}>{expanded ? "−" : "+"}</span>
          )}
        </div>
        {expanded && detail && (
          <pre style={{ marginTop: 10, fontFamily: "var(--font-mono-jb), monospace", fontSize: 11, lineHeight: 1.7, color: "var(--skeuo-text-inset-color)", background: "var(--skeuo-bg)", boxShadow: "inset 6px 6px 10px 0 var(--skeuo-shadow-dark-strong), inset -6px -6px 10px 0 var(--skeuo-shadow-light)", border: "1px solid var(--skeuo-border)", boxShadow: "9px 9px 16px var(--skeuo-shadow-dark), -9px -9px 16px var(--skeuo-shadow-light-strong)", borderRadius: 4, padding: "10px 12px", overflow: "auto", whiteSpace: "pre-wrap" }}>
            {detail}
          </pre>
        )}
      </div>
    </div>
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
    : totalCount   // live: all fetched events are considered relevant

  return (
    <main style={{ padding: "clamp(20px,4vw,40px) clamp(20px,4vw,48px)", maxWidth: 860 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--skeuo-text-inset-color)", textShadow: "-1px -1px 1px var(--skeuo-text-shadow-light), 1px 1px 1px var(--skeuo-text-shadow-dark)", marginBottom: 8, fontFamily: "var(--font-mono-jb), monospace" }}>
          03 / Timeline
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--skeuo-text-color)", textShadow: "1px 1px 0 var(--skeuo-text-shadow-light)", letterSpacing: "-0.3px", marginBottom: 6 }}>
          Investigation log
        </h1>
        <p style={{ fontSize: 13, color: "var(--skeuo-text-inset-color)" }}>
          {sess.mode === "demo"
            ? <>{totalCount} events captured — <span style={{ color: "#DB2424" }}>{relevantCount} relevant to this failure</span></>
            : <>{totalCount} event{totalCount !== 1 ? "s" : ""} in session</>
          }
        </p>
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
