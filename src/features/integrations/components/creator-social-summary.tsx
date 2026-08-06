import { formatDistanceToNow } from "date-fns";
import { BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/utils/format";
import { SOCIAL_META } from "@/features/integrations/config/social-meta";
import type { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";

type SocialConnections = Awaited<ReturnType<typeof getConnectionsForMember>>;

/**
 * Aggregated "Creator Social Summary" — one reusable card summing a
 * member's reach across every connected platform. Reuses whatever
 * `connections` the caller already fetched (getConnectionsForMember);
 * never issues its own query, so it's safe to drop into any page that
 * already loads connections without adding a request.
 */
export function CreatorSocialSummary({ connections, className }: { connections: SocialConnections; className?: string }) {
  const connected = connections.filter((c) => (c.status === "CONNECTED" || c.status === "ERROR") && c.followerCount != null);
  if (connected.length === 0) return null;

  const totalAudience = connected.reduce((sum, c) => sum + (c.followerCount ?? 0), 0);
  const verifiedCount = connected.filter((c) => c.verified).length;
  const mostRecentSync = connected
    .map((c) => c.lastSyncedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <Card className={cn("rounded-2xl", className)}>
      <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
        {connected.map((c) => (
          <div key={c.platform} className="min-w-16">
            <p className="text-xs text-muted-foreground">{SOCIAL_META[c.platform]?.label}</p>
            <p className="text-lg font-semibold tracking-tight tabular-nums">{formatCompactNumber(c.followerCount!)}</p>
          </div>
        ))}
        <div className="min-w-20">
          <p className="text-xs text-muted-foreground">Total Audience</p>
          <p className="text-lg font-semibold tracking-tight tabular-nums">{formatCompactNumber(totalAudience)}</p>
        </div>
        <div className="min-w-20">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <BadgeCheck className="size-3" /> Verified Platforms
          </p>
          <p className="text-lg font-semibold tracking-tight tabular-nums">{verifiedCount}</p>
        </div>
        {mostRecentSync && (
          <div className="min-w-20 sm:ml-auto">
            <p className="text-xs text-muted-foreground">Updated</p>
            <p className="text-sm">{formatDistanceToNow(mostRecentSync, { addSuffix: true })}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
