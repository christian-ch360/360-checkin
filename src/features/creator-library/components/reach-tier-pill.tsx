import { cn } from "@/lib/utils";
import type { ReachTier } from "@/features/creator-library/lib/reach";

/**
 * Reach tier pill — deliberately one consistent gold treatment across every
 * tier rather than a different hue per level, so the tier name (not a
 * rainbow of colors) does the differentiating; "Elite" gets the deeper gold
 * fill to read as the top rung.
 */
export function ReachTierPill({
  tier,
  className,
  showRange = false,
}: {
  tier: ReachTier | null;
  className?: string;
  showRange?: boolean;
}) {
  if (!tier) return null;
  const isElite = tier.key === "elite";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.14em]",
        isElite ? "border-[#D4AF6A] bg-[#D4AF6A] text-white" : "border-[#E8D5A3] bg-[#FBF3DE] text-[#8A6A2E]",
        className,
      )}
    >
      {tier.label}
      {showRange ? <span className="opacity-70">· {tier.range}</span> : null}
    </span>
  );
}
