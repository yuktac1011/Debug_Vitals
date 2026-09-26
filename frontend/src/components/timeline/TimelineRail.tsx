"use client";

import { TimelineRow, type TimelineEvent } from "./TimelineRow";

/**
 * DRD §4.3 — vertical chronological rail.
 * Rows are per §3.4. Implicated events are visually highlighted.
 */

interface TimelineRailProps {
  events: TimelineEvent[];
  /** Event id to scroll into view and highlight (driven by evidence link clicks) */
  highlightedEventId?: string;
}

export function TimelineRail({ events, highlightedEventId }: TimelineRailProps) {
  if (events.length === 0) {
    return (
      <p className="font-mono text-[13px] text-text-dim px-4 py-8 text-center">
        No events captured for this session yet.
      </p>
    );
  }

  return (
    <div
      className="flex flex-col divide-y divide-[rgba(140,138,130,0.14)]"
      role="list"
      aria-label="Agent timeline"
    >
      {events.map((event) => (
        <div key={event.id} role="listitem">
          <TimelineRow
            event={event}
            isHighlighted={event.id === highlightedEventId}
          />
        </div>
      ))}
    </div>
  );
}
