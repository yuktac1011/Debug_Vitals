"use client";

export function StatusLine({
  label,
  ok,
  warn,
  detail,
}: {
  label: string;
  ok?: boolean;
  warn?: boolean;
  detail?: string;
}) {
  return (
    <span className="font-mono text-[11px] text-text-dim flex items-center gap-1.5">
      {label}
      {": "}
      <span
        className={
          ok ? "text-success" : warn ? "text-warning" : "text-failure"
        }
      >
        {ok ? "responding" : warn ? "checking" : "unreachable"}
        {ok && detail ? `, ${detail}` : ""}
      </span>
    </span>
  );
}
