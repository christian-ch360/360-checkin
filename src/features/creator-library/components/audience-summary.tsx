import { cn } from "@/lib/utils";
import { PLATFORM_LABELS } from "@/features/creator-library/config/library-config";
import { formatAudience, type AudienceBreakdown } from "@/features/creator-library/lib/audience";

/**
 * Spec §11–12 — total audience with a per-platform breakdown. Never invents
 * numbers: when there's no data it says so plainly.
 */
export function AudienceSummary({
  audience,
  variant = "card",
  className,
}: {
  audience: AudienceBreakdown;
  variant?: "card" | "detail";
  className?: string;
}) {
  if (audience.isEmpty) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>Audience data unavailable</p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-semibold tracking-tight tabular-nums",
            variant === "detail" ? "text-4xl" : "text-2xl",
          )}
        >
          {formatAudience(audience.total)}
        </span>
        <span className="text-[0.65rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Total Audience
        </span>
      </div>
      {/* On the detail page the caller renders a full platform table, so the
          inline breakdown is card-only. */}
      {variant === "card" ? (
        <ul className="grid grid-cols-1 gap-y-1 text-xs">
          {audience.platforms.map((entry) => (
            <li key={entry.platform} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{PLATFORM_LABELS[entry.platform]}</span>
              <span className="font-medium tabular-nums">{formatAudience(entry.count)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
