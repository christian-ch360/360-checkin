"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { contentCategoryValues, CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import type { ContentCategory } from "@prisma/client";
import {
  bulkAssignCategories,
  bulkAssignLocation,
  bulkSetFeatured,
  bulkSetVisibility,
} from "@/features/creator-library/services/creator-library-admin.actions";

type Dialogs = "categories" | "location" | null;

/** Spec §12 — the sticky bar shown when profiles are selected in the admin table. */
export function AdminBulkActionBar({
  profileIds,
  onDone,
  onClear,
}: {
  profileIds: string[];
  onDone: () => void;
  onClear: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [catMode, setCatMode] = useState<"merge" | "replace">("merge");
  const [country, setCountry] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");

  function runAction(fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        toast.error(result.error ?? "Bulk action failed.");
        return;
      }
      toast.success(okMsg);
      setDialog(null);
      setCategories([]);
      setCountry("");
      setStateName("");
      setCity("");
      onDone();
    });
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/95 p-3 shadow-2xl shadow-black/20 backdrop-blur">
        <span className="px-1 text-sm font-semibold">
          {profileIds.length} creator{profileIds.length === 1 ? "" : "s"} selected
        </span>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button size="sm" variant="outline" onClick={() => setDialog("categories")} disabled={isPending}>
          Assign category
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDialog("location")} disabled={isPending}>
          Assign location
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => runAction(() => bulkSetVisibility({ profileIds, visible: true }), "Published.")}
        >
          Publish
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => runAction(() => bulkSetVisibility({ profileIds, visible: false }), "Hidden.")}
        >
          Hide
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => runAction(() => bulkSetFeatured({ profileIds, featured: true }), "Featured.")}
        >
          Feature
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => runAction(() => bulkSetFeatured({ profileIds, featured: false }), "Unfeatured.")}
        >
          Unfeature
        </Button>
        {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        <button
          type="button"
          onClick={onClear}
          className="ml-auto rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Clear selection"
        >
          <X className="size-4" />
        </button>
      </div>

      <Dialog open={dialog === "categories"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign categories to {profileIds.length} creators</DialogTitle>
            <DialogDescription>Merge adds to each creator&apos;s categories; replace overwrites them.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-1.5">
            {(["merge", "replace"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setCatMode(m)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium capitalize",
                  catMode === m ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
            {contentCategoryValues.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
                }
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium",
                  categories.includes(c)
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {CONTENT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending || categories.length === 0}
              onClick={() =>
                runAction(
                  () => bulkAssignCategories({ profileIds, categories, mode: catMode }),
                  `Categories ${catMode === "merge" ? "added" : "set"}.`,
                )
              }
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "location"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign location to {profileIds.length} creators</DialogTitle>
            <DialogDescription>Overwrites Country / State / City on every selected profile. Blank clears that part.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-country">Country</Label>
              <Input id="bulk-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-state">State / Province</Label>
              <Input id="bulk-state" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="California" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-city">City</Label>
              <Input id="bulk-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Los Angeles" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending || (!country.trim() && !stateName.trim() && !city.trim())}
              onClick={() =>
                runAction(
                  () =>
                    bulkAssignLocation({
                      profileIds,
                      country: country.trim() || null,
                      state: stateName.trim() || null,
                      city: city.trim() || null,
                    }),
                  "Location assigned.",
                )
              }
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
