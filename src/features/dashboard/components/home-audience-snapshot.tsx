import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreatorSocialSummary } from "@/features/integrations/components/creator-social-summary";
import type { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";

type SocialConnections = Awaited<ReturnType<typeof getConnectionsForMember>>;

/**
 * Home-page wrapper around the existing CreatorSocialSummary card — that
 * component renders nothing at all when no platform is connected, which is
 * correct for the places it's already used (a member/profile page has other
 * content around it), but Home needs an explicit empty state so this slot
 * is never just blank. Adds only that empty-state branch; the connected
 * case renders the exact same shared component, unmodified.
 */
export function HomeAudienceSnapshot({ connections }: { connections: SocialConnections }) {
  const hasAudience = connections.some((c) => (c.status === "CONNECTED" || c.status === "ERROR") && c.followerCount != null);

  if (!hasAudience) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Users className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">No audience data yet</p>
            <p className="text-xs text-muted-foreground">
              Connect your social accounts to automatically keep your audience information updated.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/profile?tab=integrations">Connect</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <CreatorSocialSummary connections={connections} />;
}
