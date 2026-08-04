"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";

export type ManageStatRow = { label: string; value: string };

export function ManageConnectionDialog({
  open,
  onOpenChange,
  name,
  status,
  lastSyncedAt,
  lastSyncError,
  statRows,
  onSync,
  onDisconnect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  statRows: ManageStatRow[];
  onSync: () => Promise<{ success: boolean; error?: string }>;
  onDisconnect: () => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [isSyncing, startSync] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();

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
        onOpenChange(false);
      }
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileFullscreen>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            {status === "ERROR" ? "Something went wrong on the last sync." : "Manage this connection's sync and access."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge
              variant="outline"
              className={cn(status === "ERROR" ? statusToneClass.error : statusToneClass.success)}
            >
              {status === "ERROR" ? "Sync error" : "Connected"}
            </Badge>
          </div>

          {statRows.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {statRows.map((row) => (
                <div key={row.label} className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="mt-0.5 text-sm font-semibold tracking-tight">{row.value}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {lastSyncedAt ? `Last synced ${format(lastSyncedAt, "MMM d, h:mm a")}` : "Never synced"}
          </p>

          {lastSyncError && <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">{lastSyncError}</p>}
        </div>

        <DialogFooter className="sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isDisconnecting}>
                Disconnect
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect {name}?</AlertDialogTitle>
                <AlertDialogDescription>You&apos;ll need to reconnect to resume syncing.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={disconnect} disabled={isDisconnecting}>
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={sync} disabled={isSyncing}>
            <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
            Sync now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
