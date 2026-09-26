"use client";

/**
 * DRD §3.7 — explicit banner across the affected view on disconnect.
 * Never a blank or frozen screen.
 */
interface ReconnectingBannerProps {
  visible: boolean;
}

export function ReconnectingBanner({ visible }: ReconnectingBannerProps) {
  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full bg-ink-raised border-b border-pending/40 px-4 py-2 flex items-center gap-3"
    >
      <span className="font-mono text-[12px] text-pending">
        ● Reconnecting to session…
      </span>
      <span className="font-sans text-[13px] text-text-dim">
        Updates are paused. Live data will resume automatically.
      </span>
    </div>
  );
}
