"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";
import { ManageConnectionDialog, type ManageStatRow } from "@/features/integrations/components/manage-connection-dialog";

export type PlatformCardProps = {
  /** Pre-rendered icon element (e.g. `<Music2 className="size-5" />`) — a component reference can't cross the server/client boundary as a prop. */
  icon: React.ReactNode;
  accentClass: string;
  name: string;
  description: string;
  configured: boolean;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  accountLabel: string | null;
  metricLabel: string | null;
  profileImageUrl?: string | null;
  lastSyncedAt: Date | null;
  lastSyncError?: string | null;
  /** Bare-link connect (social platforms). Omit and pass `connectTrigger` instead when a pre-connect step is needed (e.g. Shopify's domain entry). */
  connectHref?: string;
  connectTrigger?: React.ReactNode;
  statRows: ManageStatRow[];
  onSync: () => Promise<{ success: boolean; error?: string }>;
  onDisconnect: () => Promise<{ success: boolean; error?: string }>;
};

/**
 * One shared premium card for all 4 integrations — TikTok/Instagram/YouTube
 * (bare-link connect) and Online Store (custom connect trigger, since
 * Shopify needs a shop domain before OAuth can start). Reused verbatim so a
 * future store provider joining Shopify never needs a UI redesign.
 */
export function PlatformCard({
  icon,
  accentClass,
  name,
  description,
  configured,
  status,
  accountLabel,
  metricLabel,
  profileImageUrl,
  lastSyncedAt,
  lastSyncError,
  connectHref,
  connectTrigger,
  statRows,
  onSync,
  onDisconnect,
}: PlatformCardProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const isConnected = status === "CONNECTED" || status === "ERROR";

  return (
    <>
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external platform avatar, not a local/optimizable asset
              <img src={profileImageUrl} alt="" className={cn("size-12 shrink-0 rounded-full object-cover ring-1 ring-foreground/8")} />
            ) : (
              <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", accentClass)}>{icon}</div>
            )}
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {!configured ? (
              <Badge variant="outline" className={cn(statusToneClass.neutral)}>
                Not configured yet
              </Badge>
            ) : status === "CONNECTED" ? (
              <Badge variant="outline" className={cn(statusToneClass.success)}>
                Connected
              </Badge>
            ) : status === "ERROR" ? (
              <Badge variant="outline" className={cn(statusToneClass.error)}>
                Sync error
              </Badge>
            ) : (
              <Badge variant="outline" className={cn(statusToneClass.neutral)}>
                Not connected
              </Badge>
            )}
            {isConnected && (
              <div className="text-xs text-muted-foreground">
                {accountLabel && <p className="truncate font-medium text-foreground">{accountLabel}</p>}
                {metricLabel && <p>{metricLabel}</p>}
                <p>{lastSyncedAt ? `Last synced ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}` : "Never synced"}</p>
              </div>
            )}
          </div>

          {isConnected ? (
            <Button variant="outline" className="w-full" onClick={() => setManageOpen(true)}>
              Manage
            </Button>
          ) : connectTrigger ? (
            connectTrigger
          ) : (
            <Button className="w-full" disabled={!configured} asChild={configured}>
              {configured ? <a href={connectHref}>Connect</a> : <span>Connect</span>}
            </Button>
          )}
        </CardContent>
      </Card>

      <ManageConnectionDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        name={name}
        status={status}
        lastSyncedAt={lastSyncedAt}
        lastSyncError={lastSyncError ?? null}
        statRows={statRows}
        onSync={onSync}
        onDisconnect={onDisconnect}
      />
    </>
  );
}
