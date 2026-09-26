"use client";

import { useEffect, useRef, useState } from "react";

/** DRD §3.1 — three words only, maps to diagnostic state, never a bar or % */
export type ConfidenceLevel = "suspected" | "likely" | "confirmed";

interface ConfidenceStateProps {
  level: ConfidenceLevel;
  /** Previous level — when provided the delta animation fires (DRD §2.4) */
  previousLevel?: ConfidenceLevel;
}

const LABELS: Record<ConfidenceLevel, string> = {
  suspected: "Suspected",
  likely: "Likely",
  confirmed: "Confirmed",
};

const COLORS: Record<ConfidenceLevel, string> = {
  suspected: "text-pending",
  likely: "text-pending",
  confirmed: "text-confirmed",
};

export function ConfidenceState({ level, previousLevel }: ConfidenceStateProps) {
  const [animating, setAnimating] = useState(false);
  const prevRef = useRef(previousLevel);

  useEffect(() => {
    if (previousLevel && previousLevel !== level) {
      prevRef.current = previousLevel;
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 500);
      return () => clearTimeout(t);
    }
  }, [level, previousLevel]);

  if (animating && prevRef.current) {
    return (
      <span
        className="confidence-delta-anim inline-flex flex-col leading-none"
        aria-label={`Confidence changed from ${LABELS[prevRef.current]} to ${LABELS[level]}`}
      >
        <span className={`confidence-old font-mono text-[13px] ${COLORS[prevRef.current]}`}>
          {LABELS[prevRef.current]}
        </span>
        <span className={`confidence-new font-mono text-[13px] ${COLORS[level]}`}>
          {LABELS[level]}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`font-mono text-[13px] ${COLORS[level]}`}
      aria-label={`Confidence: ${LABELS[level]}`}
    >
      {LABELS[level]}
    </span>
  );
}
