"use client";

/** DRD §3.2 — Plex Mono, em-dash prefixed, each line links to its timeline event */
export interface EvidenceLine {
  id: string;
  text: string;
  /** The timeline event id this evidence traces back to */
  timelineEventId?: string;
}

interface EvidenceListProps {
  items: EvidenceLine[];
  sessionId: string;
  /** Called when user clicks an evidence line to highlight the timeline event */
  onTraceEvent?: (timelineEventId: string) => void;
}

export function EvidenceList({
  items,
  sessionId,
  onTraceEvent,
}: EvidenceListProps) {
  return (
    <ol className="space-y-1 list-none" aria-label="Diagnostic evidence">
      {items.map((item) => {
        const isLinked = Boolean(item.timelineEventId);
        const href = isLinked
          ? `/timeline/${sessionId}?event=${item.timelineEventId}`
          : undefined;

        return (
          <li key={item.id} className="flex items-start gap-2">
            <span
              className="font-mono text-[12px] text-text-dim select-none mt-[1px]"
              aria-hidden="true"
            >
              —
            </span>
            {isLinked ? (
              <a
                href={href}
                onClick={(e) => {
                  if (onTraceEvent && item.timelineEventId) {
                    e.preventDefault();
                    onTraceEvent(item.timelineEventId);
                  }
                }}
                className="font-mono text-[13px] text-ink-on-parchment hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pending"
                aria-label={`Evidence: ${item.text} — view in timeline`}
              >
                {item.text}
              </a>
            ) : (
              <span className="font-mono text-[13px] text-ink-on-parchment">
                {item.text}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
