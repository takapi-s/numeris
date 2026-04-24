import type React from "react";

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl bg-black/30 px-3 py-2.5 text-sm text-zinc-100 ring-1 ring-white/10 placeholder:text-zinc-500",
        "focus:outline-none focus:ring-2 focus:ring-sky-400/60",
        className,
      ].join(" ")}
    />
  );
}

