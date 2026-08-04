import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<string, string> = {
  A: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  B: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  C: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  D: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  E: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export function TierBadge({ code, percentage }: { code: string; percentage?: string | number }) {
  return (
    <Badge variant="outline" className={cn(TIER_STYLES[code] ?? "")}>
      Tier {code}
      {percentage !== undefined && ` · ${percentage}%`}
    </Badge>
  );
}
