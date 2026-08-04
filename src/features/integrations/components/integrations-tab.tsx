import { Store } from "lucide-react";
import { PlatformCard } from "@/features/integrations/components/platform-card";
import { ConnectStoreDialog } from "@/features/integrations/components/connect-store-dialog";
import { IntegrationsSuccessDialog } from "@/features/integrations/components/integrations-success-dialog";
import { Button } from "@/components/ui/button";
import { disconnectPlatform, resyncPlatform } from "@/features/integrations/services/actions";
import { disconnectStore, resyncStore } from "@/features/integrations/services/store-actions";
import { SOCIAL_META } from "@/features/integrations/config/social-meta";
import type { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";
import type { getStoreConnectionsForMember } from "@/features/integrations/services/store-connections.service";

type SocialConnections = Awaited<ReturnType<typeof getConnectionsForMember>>;
type StoreConnections = Awaited<ReturnType<typeof getStoreConnectionsForMember>>;

function formatCount(n: number | null): string | null {
  if (n == null) return null;
  return n.toLocaleString();
}

export function IntegrationsTab({
  connections,
  storeConnections,
}: {
  connections: SocialConnections;
  storeConnections: StoreConnections;
}) {
  const store = storeConnections.find((c) => c.provider === "SHOPIFY");

  return (
    <div className="space-y-4">
      <IntegrationsSuccessDialog />

      <div>
        <h2 className="font-heading text-lg font-semibold">Platform Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect your accounts in under 2 minutes — official OAuth only, no API keys, no manual setup.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {connections.map((connection) => {
          const meta = SOCIAL_META[connection.platform];
          const metricParts = [
            connection.followerCount != null && `${formatCount(connection.followerCount)} followers`,
            connection.followingCount != null && `${formatCount(connection.followingCount)} following`,
            connection.postCount != null && `${formatCount(connection.postCount)} posts`,
            connection.likesCount != null && `${formatCount(connection.likesCount)} likes`,
          ].filter(Boolean) as string[];

          return (
            <PlatformCard
              key={connection.platform}
              icon={meta.icon}
              accentClass={meta.accentClass}
              name={connection.label}
              description={meta.description}
              configured={connection.configured}
              status={connection.status}
              accountLabel={connection.externalUsername ? `@${connection.externalUsername}` : null}
              metricLabel={metricParts.length > 0 ? metricParts.join(" · ") : null}
              profileImageUrl={connection.profileImageUrl}
              lastSyncedAt={connection.lastSyncedAt}
              lastSyncError={connection.lastSyncError}
              connectHref={`/api/integrations/${connection.platform.toLowerCase()}/connect`}
              statRows={[
                connection.followerCount != null && { label: "Followers", value: formatCount(connection.followerCount)! },
                connection.followingCount != null && { label: "Following", value: formatCount(connection.followingCount)! },
                connection.postCount != null && { label: "Posts", value: formatCount(connection.postCount)! },
                connection.likesCount != null && { label: "Likes", value: formatCount(connection.likesCount)! },
              ].filter(Boolean) as { label: string; value: string }[]}
              onSync={resyncPlatform.bind(null, connection.platform)}
              onDisconnect={disconnectPlatform.bind(null, connection.platform)}
            />
          );
        })}

        {store && (
          <PlatformCard
            icon={<Store className="size-5" />}
            accentClass="bg-[#95bf47] text-white"
            name="Online Store"
            description="Connect your store to sync revenue automatically."
            configured={store.configured}
            status={store.status}
            accountLabel={store.storeName}
            metricLabel={store.storeDomain}
            lastSyncedAt={store.lastSyncedAt}
            lastSyncError={store.lastSyncError}
            connectTrigger={
              <ConnectStoreDialog
                provider="SHOPIFY"
                label="Shopify"
                trigger={
                  <Button className="w-full" disabled={!store.configured}>
                    Connect
                  </Button>
                }
              />
            }
            statRows={[
              store.storeName && { label: "Store name", value: store.storeName },
              store.revenueSyncStatus && { label: "Revenue sync", value: store.revenueSyncStatus },
            ].filter(Boolean) as { label: string; value: string }[]}
            onSync={resyncStore.bind(null, "SHOPIFY")}
            onDisconnect={disconnectStore.bind(null, "SHOPIFY")}
          />
        )}
      </div>
    </div>
  );
}
