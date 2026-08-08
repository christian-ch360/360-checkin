"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { SpaceFormDialog } from "@/features/spaces/components/space-form";
import {
  archiveSpaceAction,
  restoreSpaceAction,
  deleteSpaceAction,
  getSpaceBookingImpactAction,
} from "@/features/spaces/services/actions";
import type { SpaceDashboardItem } from "@/features/spaces/services/spaces.service";

/**
 * Edit/Archive/Restore/Delete for one space card. The Dialog and AlertDialog
 * are rendered as siblings of the DropdownMenu, not nested inside it — a
 * Dialog nested in a closing DropdownMenu can lose its open state to the
 * menu's own unmount. Every trigger stops propagation since the whole card
 * is itself a click target that navigates to the space's detail page.
 */
export function SpaceActionsMenu({
  space,
  canManage,
  canDelete,
}: {
  space: SpaceDashboardItem;
  canManage: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [impact, setImpact] = useState<{ reservationCount: number; sessionCount: number } | null>(null);

  if (!canManage && !canDelete) return null;

  function run(action: () => Promise<{ success: boolean; error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  function openDeleteDialog() {
    setDeleteOpen(true);
    setImpact(null);
    setLoadingImpact(true);
    startTransition(async () => {
      const result = await getSpaceBookingImpactAction(space.id);
      setLoadingImpact(false);
      if (result.success) {
        setImpact({ reservationCount: result.reservationCount, sessionCount: result.sessionCount });
      } else {
        toast.error(result.error);
        setDeleteOpen(false);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSpaceAction(space.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Space deleted");
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Space actions"
            className="size-7 bg-background/80 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
            disabled={isPending}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {canManage && (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="size-3.5" /> Edit
            </DropdownMenuItem>
          )}
          {canManage && space.isActive && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => run(() => archiveSpaceAction(space.id), "Space archived")}
            >
              <Archive className="size-3.5" /> Archive
            </DropdownMenuItem>
          )}
          {canManage && !space.isActive && (
            <DropdownMenuItem onSelect={() => run(() => restoreSpaceAction(space.id), "Space restored")}>
              <ArchiveRestore className="size-3.5" /> Restore
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={openDeleteDialog}>
                <Trash2 className="size-3.5" /> Delete permanently
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canManage && <SpaceFormDialog space={space} open={editOpen} onOpenChange={setEditOpen} />}

      {canDelete && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete &ldquo;{space.name}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                {loadingImpact
                  ? "Checking bookings..."
                  : impact && (impact.reservationCount > 0 || impact.sessionCount > 0)
                    ? `This space has ${impact.reservationCount} reservation${impact.reservationCount === 1 ? "" : "s"} and ${impact.sessionCount} session${impact.sessionCount === 1 ? "" : "s"} on record — all of it will be permanently deleted along with the space. This can't be undone. Archive instead if you want to keep the history.`
                    : "This can't be undone. Archive instead if you might need this space again."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isPending || loadingImpact}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
