"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { BadgeCheck, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";
import { DisconnectConfirmDialog } from "@/features/integrations/components/manage-connection-dialog";
import { UnlockBullets } from "@/features/integrations/components/unlock-bullets";
import type { ManageStatRow } from "@/features/integrations/components/manage-connection-dialog";

export type PlatformCardProps = {
  /** Pre-rendered icon element (e.g. `<Music2 className="size-5" />`) — a component reference can't cross the server/client boundary as a prop. Also the disconnected-state avatar fallback. */
  icon: React.ReactNode;
  accentClass: string;
  name: string;
  description: string;
  configured: boolean;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  accountLabel: string | null;
  profileImageUrl?: string | null;
  verified?: boolean | null;
  statRows: ManageStatRow[];
  lastSyncedAt: Date | null;
  lastSyncError?: string | null;
  /** Bare-link connect (social platforms). Omit and pass `connectTrigger` instead when a pre-connect step is needed (e.g. Shopify's domain entry). */
  connectHref?: string;
  connectTrigger?: React.ReactNode;
  /** What connecting unlocks — shown as a bullet list in the disconnected state. Omit for non-social integrations (e.g. Store) that don't have a creator-metrics pitch. */
  unlockBullets?: string[];
  onSync: () => Promise<{ success: boolean; error?: string }>;
  onDisconnect: () => Promise<{ success: boolean; error?: string }>;
};

/**
 * One shared premium card for all 4 integrations — TikTok/Instagram/YouTube
 * (bare-link connect) and Online Store (custom connect trigger, since
 * Shopify needs a shop domain before OAuth can start). Connected, this is a
 * small dashboard: profile photo, verified badge, live stats, and Sync Now/
 * Disconnect directly on the card — no click-through required to see or act
 * on any of it.
 */
export function PlatformCard({
  icon,
  accentClass,
  name,
  description,
  configured,
  status,
  accountLabel,
  profileImageUrl,
  verified,
  statRows,
  lastSyncedAt,
  lastSyncError,
  connectHref,
  connectTrigger,
  unlockBullets,
  onSync,
  onDisconnect,
}: PlatformCardProps) {
  const router = useRouter();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [isSyncing, startSync] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();
  const isConnected = status === "CONNECTED" || status === "ERROR";

  function sync() {
    startSync(async () => {
      const result = await onSync();
      if (!result.success) toast.error(result.error ?? "Sync failed");
      else toast.success(`${name} synced`);
      router.refresh();
    });
  }

  function disconnect() {
    startDisconnect(async () => {
      const result = await onDisconnect();
      if (!result.success) toast.error(result.error ?? "Disconnect failed");
      else {
        toast.success(`Disconnected ${name}`);
        setDisconnectOpen(false);
      }
      router.refresh();
    });
  }

  const badge = isSyncing ? (
    <Badge variant="outline" className={cn(statusToneClass.neutral, "gap-1")}>
      <Loader2 className="size-3 animate-spin" /> Syncing...
    </Badge>
  ) : status === "CONNECTED" ? (
    <Badge variant="outline" className={cn(statusToneClass.success)}>
      Connected
    </Badge>
  ) : status === "ERROR" ? (
    <Badge variant="outline" className={cn(statusToneClass.error)}>
      Sync Failed
    </Badge>
  ) : (
    <Badge variant="outline" className={cn(statusToneClass.neutral)}>
      Disconnected
    </Badge>
  );

  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external platform avatar, not a local/optimizable asset
              <img src={profileImageUrl} alt="" className="size-12 shrink-0 rounded-full object-cover ring-1 ring-foreground/8" />
            ) : (
              <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", accentClass)}>{icon}</div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-heading text-base font-semibold">
                  {isConnected && accountLabel ? accountLabel : name}
                </p>
                {verified && <BadgeCheck className="size-4 shrink-0 fill-primary text-primary-foreground" aria-label="Verified" />}
              </div>
              <p className="truncate text-xs text-muted-foreground">{isConnected ? name : description}</p>
            </div>
          </div>
          {badge}
        </div>

        {isConnected ? (
          <>
            {statRows.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {statRows.map((row) => (
                  <div key={row.label} className="min-w-0 rounded-xl border p-3">
                    <p className="truncate text-xs text-muted-foreground">{row.label}</p>
                    <p className="mt-0.5 truncate text-lg font-semibold tracking-tight">{row.value}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {lastSyncedAt ? `Updated ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}` : "Not synced yet"}
            </p>

            {status === "ERROR" && lastSyncError && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {lastSyncError}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={sync} disabled={isSyncing}>
                <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setDisconnectOpen(true)} disabled={isDisconnecting}>
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={undefined}
            title="Disconnected"
            description={
              unlockBullets && unlockBullets.length > 0 ? (
                <UnlockBullets lead={`Connect your ${name} account to unlock:`} items={unlockBullets} />
              ) : (
                description
              )
            }
            action={
              connectTrigger ? (
                connectTrigger
              ) : configured ? (
                <Button asChild>
                  <a href={connectHref}>Connect Account</a>
                </Button>
              ) : (
                <Badge variant="outline" className={statusToneClass.neutral}>
                  Coming soon
                </Badge>
              )
            }
            className="py-6"
          />
        )}
      </CardContent>

      <DisconnectConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        name={name}
        isDisconnecting={isDisconnecting}
        onConfirm={disconnect}
      />
    </Card>
  );
}
