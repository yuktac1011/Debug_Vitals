"use client";

export function ReconnectingBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="reconnect-banner" role="alert" aria-live="assertive">
      <span className="live-dot live-dot--warn" aria-hidden="true" />
      Reconnecting to session — updates paused
    </div>
  );
}
