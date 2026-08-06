import { formatDistanceToNow } from "date-fns";
import { BadgeCheck, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/utils/format";
import { SOCIAL_META } from "@/features/integrations/config/social-meta";
import { SOCIAL_UNLOCK_BULLETS } from "@/features/integrations/config/copy";
import { UnlockBullets } from "@/features/integrations/components/unlock-bullets";
import { SocialSparkline } from "@/features/integrations/components/social-sparkline";
import type { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";
import type { FollowerGrowth } from "@/features/integrations/services/follower-growth.service";

type SocialConnections = Awaited<ReturnType<typeof getConnectionsForMember>>;

function PlatformPresenceCard({
  connection,
  growth,
}: {
  connection: SocialConnections[number];
  growth: FollowerGrowth | undefined;
}) {
  const meta = SOCIAL_META[connection.platform];
  const delta = growth?.thirtyDayDelta ?? null;
  const positive = delta != null && delta >= 0;

  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          {connection.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external platform avatar, not a local/optimizable asset
            <img
              src={connection.profileImageUrl}
              alt=""
              className="size-11 shrink-0 rounded-full object-cover ring-1 ring-foreground/8"
            />
          ) : (
            <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", meta.accentClass)}>
              {meta.icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">
                {connection.externalUsername ? `@${connection.externalUsername}` : connection.label}
              </p>
              {connection.verified && (
                <BadgeCheck className="size-3.5 shrink-0 fill-primary text-primary-foreground" aria-label="Verified" />
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{connection.label}</p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">
              {connection.followerCount != null ? formatCompactNumber(connection.followerCount) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{meta.metricLabel}</p>
          </div>
          {growth?.hasEnoughHistory && growth.sparkline.length > 0 ? (
            <div className="shrink-0">
              <SocialSparkline points={growth.sparkline} positive={positive} />
            </div>
          ) : (
            <p className="shrink-0 text-xs text-muted-foreground">Collecting data...</p>
          )}
        </div>

        {delta != null && (
          <p className="flex items-center gap-1 text-xs">
            {positive ? (
              <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="size-3 text-destructive" />
            )}
            <span className={cn("font-medium", positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
              {positive ? "+" : ""}
              {delta.toLocaleString()}
            </span>
            <span className="text-muted-foreground">this month</span>
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {connection.lastSyncedAt ? `Updated ${formatDistanceToNow(connection.lastSyncedAt, { addSuffix: true })}` : "Not synced yet"}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Read-only display of a member's connected platforms — used on both the
 * member's own profile and an admin's view of another member. Deliberately
 * has no Sync Now/Disconnect actions: managing connections lives entirely
 * on the Integrations tab (platform-card.tsx) now, this just surfaces the
 * already-synced data wherever a creator's reach needs to be visible
 * without a click-through.
 */
export function SocialPresence({
  connections,
  growth,
  variant = "member",
  manageHref = "/profile?tab=integrations",
}: {
  connections: SocialConnections;
  growth: Record<string, FollowerGrowth>;
  variant?: "member" | "admin";
  manageHref?: string;
}) {
  const connected = connections.filter((c) => c.status === "CONNECTED" || c.status === "ERROR");

  if (connected.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Social Presence</p>
        {variant === "admin" ? (
          <p className="text-sm text-muted-foreground">No connected social accounts yet.</p>
        ) : (
          <EmptyState
            title="No accounts connected"
            description={<UnlockBullets lead="Connect your accounts to unlock:" items={SOCIAL_UNLOCK_BULLETS} />}
            action={
              <Button asChild>
                <a href={manageHref}>Connect Account</a>
              </Button>
            }
            className="py-8"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Social Presence</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {connected.map((connection) => (
          <PlatformPresenceCard key={connection.platform} connection={connection} growth={growth[connection.platform]} />
        ))}
      </div>
    </div>
  );
}
