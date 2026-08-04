"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Pencil, Copy, Archive, Pin, Star, Loader2, Eye, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
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
import {
  publishThemeAction,
  archiveThemeAction,
  duplicateThemeAction,
  setThemePinnedLiveAction,
  setThemeDefaultAction,
  deleteThemeAction,
} from "@/features/kiosk/services/kiosk-theme-actions";
import type { KioskThemeDisplayStatus } from "@/features/kiosk/services/kiosk-theme.service";

const STATUS_TONE: Record<KioskThemeDisplayStatus, string> = {
  LIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  SCHEDULED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  DRAFT: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-muted text-muted-foreground",
};

type ThemeRow = {
  id: string;
  themeKey: string;
  name: string;
  headline: string;
  status: string;
  displayStatus: KioskThemeDisplayStatus;
  isDefault: boolean;
  isPinnedLive: boolean;
  startDate: Date;
  endDate: Date;
  createdBy: { fullName: string } | null;
  event: { title: string } | null;
};

export function KioskThemesTab({ themes }: { themes: ThemeRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ThemeRow | null>(null);

  function run(themeKey: string, label: string, action: () => Promise<{ success: boolean; error?: string }>) {
    setActingOn(themeKey);
    startTransition(async () => {
      const result = await action();
      setActingOn(null);
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(label);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const themeKey = deleteTarget.themeKey;
    setActingOn(themeKey);
    startTransition(async () => {
      const result = await deleteThemeAction(themeKey);
      setActingOn(null);
      setDeleteTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Theme deleted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href="/admin/kiosk-manager/themes/new">
            <Plus className="size-4" /> Create Theme
          </Link>
        </Button>
      </div>

      {themes.length === 0 ? (
        <EmptyState icon={Star} title="No themes yet" description="Create your first kiosk theme to get started." />
      ) : (
        <div className="space-y-2">
          {themes.map((theme) => {
            const busy = isPending && actingOn === theme.themeKey;
            return (
              <Card key={theme.id} className="border shadow-sm">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{theme.name}</p>
                      <Badge
                        variant="outline"
                        className={
                          theme.displayStatus === "LIVE"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                            : "text-muted-foreground"
                        }
                      >
                        {theme.displayStatus === "LIVE" ? "Active" : "Inactive"}
                      </Badge>
                      {theme.displayStatus !== "LIVE" && (
                        <Badge variant="outline" className={STATUS_TONE[theme.displayStatus]}>
                          {theme.displayStatus}
                        </Badge>
                      )}
                      {theme.isDefault && <Badge variant="secondary">Default</Badge>}
                      {theme.isPinnedLive && <Badge variant="secondary">Pinned</Badge>}
                      {theme.event && <Badge variant="outline">Linked: {theme.event.title}</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{theme.headline}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(theme.startDate, "MMM d")} – {format(theme.endDate, "MMM d, yyyy")}
                      {theme.createdBy && ` · Last edited by ${theme.createdBy.fullName}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/kiosk-manager/themes/${theme.themeKey}`}>
                        <Pencil className="size-3.5" /> Edit
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/kiosk-manager/themes/${theme.themeKey}?preview=1`}>
                        <Eye className="size-3.5" /> Preview
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => run(theme.themeKey, "Theme duplicated.", () => duplicateThemeAction(theme.themeKey))}
                    >
                      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />} Duplicate
                    </Button>
                    {theme.status !== "PUBLISHED" && theme.status !== "ARCHIVED" && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => run(theme.themeKey, "Theme published.", () => publishThemeAction(theme.themeKey))}
                      >
                        Publish
                      </Button>
                    )}
                    {theme.status === "PUBLISHED" && !theme.isDefault && (
                      <Button
                        size="sm"
                        variant={theme.isPinnedLive ? "default" : "outline"}
                        disabled={busy}
                        onClick={() =>
                          run(theme.themeKey, theme.isPinnedLive ? "Unpinned." : "Pinned live.", () =>
                            setThemePinnedLiveAction(theme.themeKey, !theme.isPinnedLive)
                          )
                        }
                      >
                        <Pin className="size-3.5" /> {theme.isPinnedLive ? "Unpin" : "Pin Live"}
                      </Button>
                    )}
                    {theme.status === "PUBLISHED" && !theme.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => run(theme.themeKey, "Set as default.", () => setThemeDefaultAction(theme.themeKey))}
                      >
                        <Star className="size-3.5" /> Set Default
                      </Button>
                    )}
                    {theme.status !== "ARCHIVED" && !theme.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={busy}
                        onClick={() => run(theme.themeKey, "Theme archived.", () => archiveThemeAction(theme.themeKey))}
                      >
                        <Archive className="size-3.5" /> Archive
                      </Button>
                    )}
                    {!theme.isDefault && !theme.isPinnedLive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={busy}
                        onClick={() => setDeleteTarget(theme)}
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every version of this theme. This can&apos;t be undone — use Archive instead if you might want it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-white hover:bg-destructive/90">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
