"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, LayoutGrid, List, Loader2, Search, Star, UserRound } from "lucide-react";
import type { ContentCategory } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/utils/format";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import { ReachTierPill } from "@/features/creator-library/components/reach-tier-pill";
import { AdminBulkActionBar } from "@/features/creator-library/admin/admin-bulk-action-bar";
import { AdminCreatorGrid } from "@/features/creator-library/admin/admin-creator-grid";
import {
  createLibraryProfileForMember,
  setCreatorLibraryFeatured,
  setCreatorLibraryVisibility,
} from "@/features/creator-library/services/creator-library-admin.actions";
import type {
  AdminCreatorFilter,
  AdminCreatorRow,
} from "@/features/creator-library/services/creator-library-admin.service";

const FILTERS: { value: AdminCreatorFilter; label: string }[] = [
  { value: "all", label: "All Creators" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
  { value: "featured", label: "Featured" },
  { value: "not_in_library", label: "Pending" },
  { value: "standalone", label: "Imported" },
];

export function AdminLibraryTable({
  rows,
  filter,
  search,
}: {
  rows: AdminCreatorRow[];
  filter: AdminCreatorFilter;
  search: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search);
  const [isPending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const adminView = searchParams.get("adminView") === "grid" ? "grid" : "list";
  const activeCategory = searchParams.get("category") as ContentCategory | null;

  const categoryOptions = useMemo(() => {
    const counts = new Map<ContentCategory, number>();
    for (const row of rows) {
      for (const category of row.categories) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || CONTENT_CATEGORY_LABELS[a[0]].localeCompare(CONTENT_CATEGORY_LABELS[b[0]]))
      .slice(0, 12)
      .map(([category]) => category);
  }, [rows]);

  const visibleRows = activeCategory ? rows.filter((row) => row.categories.includes(activeCategory)) : rows;

  function setView(view: "grid" | "list") {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "list") params.delete("adminView");
    else params.set("adminView", "grid");
    router.push(`/admin/creator-library?${params.toString()}`);
  }

  function setCategory(category: ContentCategory | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) params.set("category", category);
    else params.delete("category");
    router.push(`/admin/creator-library?${params.toString()}`);
  }

  useEffect(() => {
    if (query === search) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      router.push(`/admin/creator-library?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const selectableIds = useMemo(
    () => visibleRows.filter((r) => r.profileId).map((r) => r.profileId as string),
    [visibleRows],
  );

  function setFilter(value: AdminCreatorFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("filter");
    else params.set("filter", value);
    router.push(`/admin/creator-library?${params.toString()}`);
  }

  function toggleSelect(profileId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === selectableIds.length ? new Set() : new Set(selectableIds)));
  }

  function run(key: string, fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) {
    setBusyKey(key);
    startTransition(async () => {
      const result = await fn();
      setBusyKey(null);
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(okMsg);
      router.refresh();
    });
  }

  function addFromMember(row: AdminCreatorRow) {
    if (!row.memberId) return;
    setBusyKey(row.key);
    startTransition(async () => {
      const result = await createLibraryProfileForMember(row.memberId as string);
      setBusyKey(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push(`/admin/creator-library/${result.profileId}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search creators by name, username, or email…"
            aria-label="Search creators"
            className="pl-9"
          />
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="List view"
            className={cn("px-2.5 py-2", adminView === "list" ? "bg-foreground text-background" : "text-muted-foreground")}
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Grid view"
            className={cn("px-2.5 py-2", adminView === "grid" ? "bg-foreground text-background" : "text-muted-foreground")}
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setFilter(entry.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] transition-colors",
              filter === entry.value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {categoryOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Category
          </span>
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              !activeCategory ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground",
            )}
          >
            All
          </button>
          {categoryOptions.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategory(activeCategory === category ? null : category)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                activeCategory === category
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {CONTENT_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      ) : null}

      {selected.size > 0 ? (
        <AdminBulkActionBar
          profileIds={[...selected]}
          onDone={() => {
            setSelected(new Set());
            router.refresh();
          }}
          onClear={() => setSelected(new Set())}
        />
      ) : null}

      {visibleRows.length === 0 ? (
        <EmptyState icon={UserRound} title="No creators match" description="Try a different search or filter." />
      ) : adminView === "grid" ? (
        <AdminCreatorGrid rows={visibleRows} selected={selected} onToggleSelect={toggleSelect} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={selectableIds.length > 0 && selected.size === selectableIds.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-3 py-2.5 font-medium">Creator</th>
                <th className="px-3 py-2.5 font-medium">Reach</th>
                <th className="px-3 py-2.5 font-medium">Location</th>
                <th className="px-3 py-2.5 font-medium">Published</th>
                <th className="px-3 py-2.5 font-medium">Featured</th>
                <th className="px-3 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const rowBusy = isPending && busyKey === row.key;
                return (
                  <tr key={row.key} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-3">
                      {row.profileId ? (
                        <Checkbox
                          checked={selected.has(row.profileId)}
                          onCheckedChange={() => toggleSelect(row.profileId as string)}
                          aria-label={`Select ${row.name}`}
                        />
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 shrink-0 overflow-hidden rounded-full bg-muted">
                          {row.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- remote URL
                            <img src={row.photoUrl} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="grid size-full place-items-center text-xs font-medium text-muted-foreground">
                              {row.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 truncate font-medium">
                            {row.name}
                            {row.verified ? (
                              <Star className="inline size-3 shrink-0 fill-[var(--community)] text-[var(--community)]" />
                            ) : null}
                            {row.standalone ? (
                              <span className="rounded bg-muted px-1 text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground">
                                Imported
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.username ? `@${row.username}` : (row.email ?? "—")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {row.audience.isEmpty ? (
                        <span className="text-xs text-muted-foreground">No data</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">{formatCompactNumber(row.audience.total)}</span>
                          <ReachTierPill tier={row.reachTier} />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{row.location ?? "—"}</td>
                    <td className="px-3 py-3">
                      {row.profileId ? (
                        <Switch
                          checked={row.visible}
                          disabled={rowBusy}
                          onCheckedChange={(value) =>
                            run(
                              row.key,
                              () => setCreatorLibraryVisibility(row.profileId as string, value),
                              value ? `${row.name} published.` : `${row.name} hidden.`,
                            )
                          }
                          aria-label={`Publish ${row.name}`}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {row.profileId ? (
                        <Switch
                          checked={row.featured}
                          disabled={!row.visible || rowBusy}
                          onCheckedChange={(value) =>
                            run(
                              row.key,
                              () => setCreatorLibraryFeatured(row.profileId as string, value),
                              value ? `${row.name} featured.` : `${row.name} unfeatured.`,
                            )
                          }
                          aria-label={`Feature ${row.name}`}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {row.profileId && row.visible ? (
                          <Button asChild variant="ghost" size="icon-sm" title="View in library">
                            <Link href={`/creator-library/${row.profileId}`} target="_blank">
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </Button>
                        ) : null}
                        {row.profileId ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/creator-library/${row.profileId}`}>Edit</Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled={rowBusy} onClick={() => addFromMember(row)}>
                            {rowBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                            Add to library
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
