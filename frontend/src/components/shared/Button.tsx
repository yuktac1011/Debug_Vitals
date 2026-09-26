import React from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  label: string;
  /** On parchment surface, use surface="parchment" to invert colors correctly */
  surface?: "dark" | "parchment";
}

/**
 * DRD §3.3 — text-labeled only, names the exact action, never icon-only.
 * Primary: filled. Secondary: outline only.
 * radius: 2px (DRD §2.3)
 */
export function Button({
  variant = "primary",
  label,
  surface = "dark",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center px-4 py-2 text-[13px] font-sans font-medium leading-none rounded-[2px] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pending disabled:opacity-40 disabled:cursor-not-allowed";

  const variants: Record<ButtonVariant, Record<"dark" | "parchment", string>> =
    {
      primary: {
        dark: "bg-text text-ink hover:bg-parchment-dim",
        parchment: "bg-ink-on-parchment text-parchment hover:bg-ink",
      },
      secondary: {
        dark: "border border-text-dim text-text hover:border-text hover:text-text bg-transparent",
        parchment:
          "border border-ink-on-parchment text-ink-on-parchment hover:bg-parchment-dim bg-transparent",
      },
    };

  return (
    <button
      className={`${base} ${variants[variant][surface]} ${className}`}
      {...props}
    >
      {label}
    </button>
  );
}
