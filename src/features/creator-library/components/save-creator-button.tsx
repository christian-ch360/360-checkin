"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "c360-library-saved";

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Spec §9 — the save/bookmark control. Visitors have no account (§2), so a
 * saved list is a per-browser convenience only: localStorage, wrapped so a
 * private window or blocked storage just renders an inert (but still visible)
 * bookmark.
 */
export function SaveCreatorButton({
  creatorId,
  tone = "overlay",
  className,
}: {
  creatorId: string;
  tone?: "overlay" | "solid";
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSaved(readSaved().includes(creatorId));
    setReady(true);
  }, [creatorId]);

  function toggle(event: React.MouseEvent) {
    // The card is a link — don't navigate when toggling the bookmark.
    event.preventDefault();
    event.stopPropagation();
    try {
      const current = new Set(readSaved());
      if (current.has(creatorId)) current.delete(creatorId);
      else current.add(creatorId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
      setSaved(current.has(creatorId));
    } catch {
      /* storage unavailable — leave state as-is */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save creator"}
      className={cn(
        "flex size-8 items-center justify-center rounded-full transition-colors",
        tone === "overlay"
          ? "bg-black/40 text-white backdrop-blur-sm hover:bg-black/55"
          : "border border-border bg-background text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Bookmark className={cn("size-4", ready && saved && "fill-current")} />
    </button>
  );
}
