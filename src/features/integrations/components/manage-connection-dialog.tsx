"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ManageStatRow = { label: string; value: string };

/**
 * The "are you sure" confirmation for disconnecting a platform. Everything
 * else a connection dialog used to show (stats, last synced, sync button)
 * now lives directly on PlatformCard itself, dashboard-style — this is only
 * the one destructive action that still needs an extra confirm step.
 */
export function DisconnectConfirmDialog({
  open,
  onOpenChange,
  name,
  isDisconnecting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isDisconnecting: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll need to reconnect to resume syncing. Your follower history is kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDisconnecting}>
            {isDisconnecting && <Loader2 className="size-4 animate-spin" />}
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
