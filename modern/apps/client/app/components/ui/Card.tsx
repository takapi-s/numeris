import type React from "react";

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  return (
    <div
      {...props}
      className={`rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur ${className}`}
    />
  );
}

export function CardHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  return <div {...props} className={`px-5 pb-3 pt-5 ${className}`} />;
}

export function CardContent({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  return <div {...props} className={`px-5 pb-5 ${className}`} />;
}

