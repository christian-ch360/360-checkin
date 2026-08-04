import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  caption,
  accent = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  /** Neutral muted note shown instead of trend — for values with no meaningful delta yet (e.g. "webhook integration pending"). */
  caption?: string;
  accent?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}
            </p>
          )}
          {!trend && caption && <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{caption}</p>}
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            accent === "primary" && "bg-primary/10 text-primary",
            accent === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            accent === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            accent === "danger" && "bg-red-500/10 text-red-600 dark:text-red-400",
            accent === "default" && "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
