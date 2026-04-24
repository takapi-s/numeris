import type React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-fuchsia-500 to-sky-400 text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.16)_inset] hover:brightness-110 active:brightness-95",
  secondary:
    "bg-white/10 text-zinc-100 ring-1 ring-white/15 backdrop-blur hover:bg-white/15",
  ghost: "bg-transparent text-zinc-200 hover:bg-white/10 ring-1 ring-white/10",
  danger: "bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/25 hover:bg-rose-500/20",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} />;
}

