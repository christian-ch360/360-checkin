"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Loader2, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CreatorPortrait } from "@/features/creator-library/components/creator-portrait";
import { ReachDisplay } from "@/features/creator-library/components/reach-display";
import { CategoryChips } from "@/features/creator-library/components/category-chips";
import {
  createLibraryProfileForMember,
  setCreatorLibraryFeatured,
  setCreatorLibraryVisibility,
} from "@/features/creator-library/services/creator-library-admin.actions";
import type { AdminCreatorRow } from "@/features/creator-library/services/creator-library-admin.service";

/**
 * Operations grid view — the same premium card language as the public
 * network, with a subtle management bar (publish, feature, edit) per creator.
 */
export function AdminCreatorGrid({
  rows,
  selected,
  onToggleSelect,
}: {
  rows: AdminCreatorRow[];
  selected: Set<string>;
  onToggleSelect: (profileId: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(okMsg);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row) => (
        <article
          key={row.key}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="relative aspect-[4/5] overflow-hidden">
            <CreatorPortrait name={row.name} imageUrl={row.photoUrl} seed={row.profileId ?? row.key} rounded="rounded-none" />
            {row.profileId ? (
              <div className="absolute left-3 top-3">
                <Checkbox
                  checked={selected.has(row.profileId)}
                  onCheckedChange={() => onToggleSelect(row.profileId as string)}
                  aria-label={`Select ${row.name}`}
                  className="border-white bg-black/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
              </div>
            ) : null}
            <div className="absolute right-3 top-3 flex gap-1.5">
              {!row.visible && row.inLibrary ? (
                <span className="rounded-full bg-black/55 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white">
                  Hidden
                </span>
              ) : null}
              {!row.inLibrary ? (
                <span className="rounded-full bg-black/55 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white">
                  Pending
                </span>
              ) : null}
              {row.featured ? (
                <span className="rounded-full bg-white/95 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-black">
                  Featured
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <div>
              <p className="truncate text-sm font-semibold">{row.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.username ? `@${row.username}` : (row.location ?? row.email ?? "—")}
              </p>
            </div>

            {row.categories.length > 0 ? <CategoryChips categories={row.categories} limit={2} /> : null}

            <div className="mt-auto border-t border-border/60 pt-3">
              <ReachDisplay audience={row.audience} />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              {row.profileId ? (
                <>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch
                      checked={row.visible}
                      disabled={isPending}
                      onCheckedChange={(value) =>
                        run(
                          () => setCreatorLibraryVisibility(row.profileId as string, value),
                          value ? `${row.name} published.` : `${row.name} hidden.`,
                        )
                      }
                      aria-label={`Publish ${row.name}`}
                    />
                    {row.visible ? "Published" : "Hidden"}
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!row.visible || isPending}
                      onClick={() =>
                        run(
                          () => setCreatorLibraryFeatured(row.profileId as string, !row.featured),
                          row.featured ? `${row.name} unfeatured.` : `${row.name} featured.`,
                        )
                      }
                      aria-label={row.featured ? "Unfeature" : "Feature"}
                      className={cn(
                        "rounded-md p-1.5 transition-colors disabled:opacity-40",
                        row.featured ? "text-[var(--community)]" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Star className={cn("size-4", row.featured && "fill-current")} />
                    </button>
                    {row.visible ? (
                      <Button asChild variant="ghost" size="icon-sm" title="View in library">
                        <Link href={`/creator-library/${row.profileId}`} target="_blank">
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </Button>
                    ) : null}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/creator-library/${row.profileId}`}>Edit</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => run(() => createLibraryProfileForMember(row.memberId as string), "Added to library.")}
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Add to library
                </Button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
