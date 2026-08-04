import type { ReactNode } from "react";

export function AuthBanner({
  tone,
  children,
  variant = "dark",
}: {
  tone: "info" | "error";
  children: ReactNode;
  variant?: "dark" | "light";
}) {
  const light = variant === "light";
  const styles = light
    ? tone === "error"
      ? "border-red-200 bg-red-50 text-red-600"
      : "border-black/10 bg-black/[0.03] text-black/70"
    : tone === "error"
      ? "border-destructive/30 bg-destructive/10 text-red-300"
      : "border-white/15 bg-white/[0.06] text-white/80";

  return (
    <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}
