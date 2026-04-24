import type React from "react";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[880px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-56 left-0 h-[520px] w-[820px] rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:px-6">{children}</div>
    </div>
  );
}

