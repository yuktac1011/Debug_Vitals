"use client";

import { useState } from "react";

/**
 * DRD §3.4 — Timeline row.
 * Implicated event: left border in --divergent + background tint + "implicated" label.
 * Three simultaneous markers (never color alone).
 */

export interface TimelineEvent {
  id: string;
  timestamp: string;
  description: string;
  /** Raw expandable payload (diff, command output, etc.) */
  rawPayload?: string;
  /** When true, this event is marked as causally implicated in the diagnosis */
  isImplicated?: boolean;
  /** Category label for the event type */
  eventType: "file_change" | "command" | "test" | "agent_action" | "result";
}

const EVENT_TYPE_LABEL: Record<TimelineEvent["eventType"], string> = {
  file_change: "file",
  command: "cmd",
  test: "test",
  agent_action: "agent",
  result: "result",
};

interface TimelineRowProps {
  event: TimelineEvent;
  isHighlighted?: boolean;
}

export function TimelineRow({ event, isHighlighted }: TimelineRowProps) {
  const [expanded, setExpanded] = useState(false);

  const implicated = event.isImplicated;

  return (
    <div
      id={`event-${event.id}`}
      className={[
        "relative flex flex-col",
        implicated
          ? "border-l-2 border-divergent bg-divergent/5"
          : "border-l-2 border-transparent",
        isHighlighted && !implicated ? "bg-pending/5 border-l-pending" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-baseline gap-4 px-4 py-3 text-left w-full hover:bg-ink-raised/60 transition-colors"
        aria-expanded={expanded}
        aria-controls={`event-payload-${event.id}`}
      >
        {/* Timestamp */}
        <span className="font-mono text-[11px] text-text-dim whitespace-nowrap shrink-0">
          {event.timestamp}
        </span>

        {/* Event type tag */}
        <span className="font-mono text-[11px] text-text-dim w-12 shrink-0">
          [{EVENT_TYPE_LABEL[event.eventType]}]
        </span>

        {/* Description */}
        <span className="font-sans text-[13px] text-text flex-1 leading-relaxed">
          {event.description}
        </span>

        {/* Implicated marker — DRD §3.4: color + label together */}
        {implicated && (
          <span
            className="font-mono text-[11px] text-divergent shrink-0 ml-auto"
            aria-label="this event is implicated in the diagnosis"
          >
            implicated
          </span>
        )}
      </button>

      {/* Expandable raw payload */}
      {expanded && event.rawPayload && (
        <div
          id={`event-payload-${event.id}`}
          className="px-4 pb-4 pl-[5.5rem]"
          aria-label="Raw event payload"
        >
          <pre className="font-mono text-[11px] text-text-dim bg-ink-raised p-3 overflow-x-auto rounded-[2px] whitespace-pre-wrap">
            {event.rawPayload}
          </pre>
        </div>
      )}
    </div>
  );
}
