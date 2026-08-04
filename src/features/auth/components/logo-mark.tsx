export function LogoMark({
  size = "md",
  variant = "dark",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "dark" | "light";
}) {
  const dims = {
    sm: "size-9 text-sm",
    md: "size-11 text-base",
    lg: "size-14 text-xl",
    xl: "size-24 text-4xl",
  }[size];
  const skin =
    variant === "light"
      ? "border-black/10 bg-gradient-to-br from-black/[0.06] to-black/[0.01] text-black shadow-none"
      : "border-white/15 bg-gradient-to-br from-white/[0.12] to-white/[0.02] text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset]";

  return (
    <div
      className={`flex ${dims} shrink-0 items-center justify-center rounded-2xl border font-semibold tracking-tight ${skin}`}
      aria-hidden="true"
    >
      CH
    </div>
  );
}
