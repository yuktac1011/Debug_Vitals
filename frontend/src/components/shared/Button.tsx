import React from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  label: string;
  size?: "sm" | "md";
}

export function Button({
  variant = "secondary",
  label,
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-ui font-medium rounded-sm transition-colors duration-100 focus-visible:outline disabled:opacity-40 disabled:cursor-not-allowed";

  const sizes = {
    sm: "px-3 py-1.5 text-[12px]",
    md: "px-4 py-2 text-[13px]",
  };

  const variants: Record<Variant, string> = {
    primary:
      "bg-text text-bg hover:bg-text/90 active:bg-text/80",
    secondary:
      "border border-border text-text-muted hover:text-text hover:border-text/30 bg-transparent",
    ghost:
      "text-text-muted hover:text-text bg-transparent",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {label}
    </button>
  );
}
