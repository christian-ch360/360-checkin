"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Copy, Eye, Loader2, Menu, Rocket, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isThemeScheduledNow } from "@/features/kiosk/config/kiosk-schedule";
import { cn } from "@/lib/utils";
import type { EditableThemeVersion } from "./types";
import { THEME_PREVIEW_PANEL_ID } from "./theme-editor-preview-panel";

type DisplayStatus = "LIVE" | "SCHEDULED" | "DRAFT" | "ARCHIVED";

/** Mirrors kiosk-theme.service.ts's computeDisplayStatus — reproduced locally
 * since that file is server-only and this bar renders client-side. Same
 * inputs (status/isPinnedLive/schedule), same 4-line rule. */
function computeDisplayStatus(latest: EditableThemeVersion): DisplayStatus {
  if (latest.status === "DRAFT") return "DRAFT";
  if (latest.status === "ARCHIVED") return "ARCHIVED";
  if (latest.isPinnedLive || isThemeScheduledNow(latest, new Date())) return "LIVE";
  return "SCHEDULED";
}

const STATUS_TONE: Record<DisplayStatus, string> = {
  LIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  SCHEDULED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  DRAFT: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export function ThemeEditorTopBar({
  themeName,
  themeKey,
  latest,
  isPending,
  onSaveDraft,
  onPublish,
  onDuplicate,
  onDeleteRequest,
  onOpenMobileNav,
}: {
  themeName: string;
  themeKey?: string;
  latest?: EditableThemeVersion | null;
  isPending: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onDuplicate: () => void;
  onDeleteRequest: () => void;
  onOpenMobileNav: () => void;
}) {
  const displayStatus = latest ? computeDisplayStatus(latest) : null;

  function scrollToPreview() {
    document.getElementById(THEME_PREVIEW_PANEL_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
      <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={onOpenMobileNav} aria-label="Open section navigation">
        <Menu className="size-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-semibold">{themeName || "Untitled Theme"}</span>
        {displayStatus && <Badge className={cn("shrink-0", STATUS_TONE[displayStatus])}>{displayStatus === "LIVE" ? "Live" : displayStatus === "SCHEDULED" ? "Scheduled" : displayStatus === "DRAFT" ? "Draft" : "Archived"}</Badge>}
        {!themeKey && <Badge variant="outline" className="shrink-0">New — Unsaved</Badge>}
        {latest?.updatedAt && (
          <span className="hidden shrink-0 text-xs whitespace-nowrap text-muted-foreground lg:inline">
            Last saved {formatDistanceToNowStrict(latest.updatedAt, { addSuffix: true })}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="xl:hidden" onClick={scrollToPreview}>
          <Eye className="size-3.5" /> Preview
        </Button>
        <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save Draft
        </Button>
        <Button size="sm" onClick={onPublish} disabled={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-3.5" />} Publish Now
        </Button>
        {themeKey && (
          <>
            <Button variant="outline" size="sm" onClick={onDuplicate} disabled={isPending}>
              <Copy className="size-3.5" /> Duplicate
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={onDeleteRequest} disabled={isPending}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
