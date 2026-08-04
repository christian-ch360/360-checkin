"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusToneClass } from "@/lib/utils/status-colors";
import { formatCompactNumber } from "@/lib/utils/format";
import { SOCIAL_META } from "@/features/integrations/config/social-meta";
import { resyncPlatform } from "@/features/integrations/services/actions";
import type { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";

type SocialConnections = Awaited<ReturnType<typeof getConnectionsForMember>>;

function SyncRow({ connection }: { connection: SocialConnections[number] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const result = await resyncPlatform(connection.platform);
      if (!result.success) toast.error(result.error);
      else toast.success(`${connection.label} synced`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{SOCIAL_META[connection.platform]?.icon}</span>
        <div>
          <p className="text-sm font-medium">
            {connection.followerCount != null ? formatCompactNumber(connection.followerCount) : "—"}{" "}
            <span className="font-normal text-muted-foreground">{connection.label}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {connection.lastSyncedAt
              ? `Synced ${formatDistanceToNow(connection.lastSyncedAt, { addSuffix: true })}`
              : "Never synced"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={statusToneClass[connection.status === "CONNECTED" ? "success" : "error"]}>
          {connection.status === "CONNECTED" ? "Connected" : "Sync error"}
        </Badge>
        <Button variant="ghost" size="icon-sm" onClick={sync} disabled={isPending} aria-label="Sync now">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

export function SocialStatsList({ connections }: { connections: SocialConnections }) {
  const connected = connections.filter((c) => c.status === "CONNECTED" || c.status === "ERROR");

  if (connected.length === 0) return null;

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-sm font-medium">Social stats</p>
      <div className="space-y-3">
        {connected.map((connection) => (
          <SyncRow key={connection.platform} connection={connection} />
        ))}
      </div>
    </div>
  );
}
