import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/utils/format";
import { SOCIAL_META } from "@/features/integrations/config/social-meta";
import type { SocialSummaryEntry } from "@/features/integrations/services/social-connections.service";

/**
 * Compact "Instagram 125K Followers · TikTok 84K Followers" line for member
 * listings (table rows, mobile cards, directory cards). Fed by the batched
 * getSocialSummaryForMembers query — one call per page load, not per row.
 */
export function FollowerBadges({ summary, className }: { summary: SocialSummaryEntry[]; className?: string }) {
  if (summary.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground", className)}>
      {summary.map((s) => (
        <span key={s.platform} className="inline-flex items-center gap-1 whitespace-nowrap">
          <span className="font-medium text-foreground/80">{SOCIAL_META[s.platform]?.label}</span>
          {formatCompactNumber(s.followerCount)} {SOCIAL_META[s.platform]?.metricLabel}
          {s.verified && <BadgeCheck className="size-3 shrink-0 fill-primary text-primary-foreground" aria-label="Verified" />}
        </span>
      ))}
    </div>
  );
}
