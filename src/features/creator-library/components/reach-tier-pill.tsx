import { cn } from "@/lib/utils";
import type { ReachTier } from "@/features/creator-library/lib/reach";

const TONE: Record<string, string> = {
  emerging: "border-border bg-muted/60 text-muted-foreground",
  rising: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  established: "border-teal-500/25 bg-teal-500/10 text-teal-600 dark:text-teal-400",
  influential: "border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  major: "border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  elite: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.14em]",
        TONE[tier.key] ?? TONE.emerging,
        className,
      )}
    >
      {tier.label}
      {showRange ? <span className="opacity-60">· {tier.range}</span> : null}
    </span>
  );
}
