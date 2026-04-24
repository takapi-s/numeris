import type React from "react";

type Tone = "neutral" | "success" | "info" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-white/10 text-zinc-200 ring-1 ring-white/15",
  success: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25",
  info: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/25",
  warning: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25",
  danger: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/25",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      {...props}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
    />
  );
}

