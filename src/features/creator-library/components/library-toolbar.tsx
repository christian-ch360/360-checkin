"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LibraryFilterSheet } from "@/features/creator-library/components/library-filter-sheet";
import {
  DEFAULT_LIBRARY_SORT,
  FOLLOWER_BUCKETS,
  LIBRARY_SORT_OPTIONS,
  PLATFORM_LABELS,
} from "@/features/creator-library/config/library-config";
import { reachTierFromKey } from "@/features/creator-library/lib/reach";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import type { ContentCategory } from "@prisma/client";
import type {
  LibraryCategoryCount,
  LibraryLocationTree,
} from "@/features/creator-library/services/creator-library.service";

const FILTER_PARAM_KEYS = ["platform", "followers", "category", "country", "state", "city", "reach", "search"];

const DISCOVERY_TABS: { label: string; view: string | null }[] = [
  { label: "All Creators", view: null },
  { label: "Categories", view: "categories" },
  { label: "Locations", view: "locations" },
  { label: "Reach", view: "reach" },
  { label: "Featured", view: "featured" },
];

/**
 * The large search area + discovery tabs from the concept. Search is debounced
 * into the URL; the Filters sheet and sort control write params immediately.
 * Active filters show as removable chips.
 */
export function LibraryToolbar({
  categories,
  locationTree,
  resultCount,
}: {
  categories: LibraryCategoryCount[];
  locationTree: LibraryLocationTree;
  resultCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const firstRender = useRef(true);
  const activeView = searchParams.get("view") ?? null;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) params.set("search", search.trim());
      else params.delete("search");
      params.delete("page");
      router.push(`/creator-library?${params.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/creator-library?${params.toString()}`, { scroll: false });
  }

  const sort = searchParams.get("sort") ?? DEFAULT_LIBRARY_SORT;
  const chips = buildActiveChips(searchParams);

  return (
    <div id="search" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search creators by name, username, category or location…"
            aria-label="Search creators"
            className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-10 text-base shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <LibraryFilterSheet categories={categories} locationTree={locationTree} />
          <Select value={sort} onValueChange={(value) => setParam("sort", value === DEFAULT_LIBRARY_SORT ? null : value)}>
            <SelectTrigger className="h-11 w-[170px] rounded-xl" aria-label="Sort creators">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIBRARY_SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap items-center gap-2">
        {DISCOVERY_TABS.map((tab) => {
          const isActive = (tab.view ?? null) === (activeView ?? null);
          return (
            <Link
              key={tab.label}
              href={tab.view ? `/creator-library?view=${tab.view}` : "/creator-library"}
              className={cn(
                "rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] transition-colors",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {chips.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {resultCount} match{resultCount === 1 ? "" : "es"}
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setParam(chip.key, null)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
            >
              {chip.label}
              <X className="size-3 text-muted-foreground" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              FILTER_PARAM_KEYS.forEach((key) => params.delete(key));
              params.delete("page");
              setSearch("");
              router.push(`/creator-library?${params.toString()}`, { scroll: false });
            }}
            className="text-xs font-medium text-[var(--community)] hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}

function buildActiveChips(searchParams: URLSearchParams): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];
  const search = searchParams.get("search");
  if (search) chips.push({ key: "search", label: `“${search}”` });

  const platform = searchParams.get("platform");
  if (platform && platform in PLATFORM_LABELS) {
    chips.push({ key: "platform", label: PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] });
  }

  const followers = searchParams.get("followers");
  const bucket = FOLLOWER_BUCKETS.find((entry) => entry.value === followers);
  if (bucket) chips.push({ key: "followers", label: bucket.label });

  const category = searchParams.get("category");
  if (category && category in CONTENT_CATEGORY_LABELS) {
    chips.push({ key: "category", label: CONTENT_CATEGORY_LABELS[category as ContentCategory] });
  }

  for (const key of ["country", "state", "city"]) {
    const value = searchParams.get(key);
    if (value) chips.push({ key, label: value });
  }

  const reach = reachTierFromKey(searchParams.get("reach"));
  if (reach) chips.push({ key: "reach", label: `${reach.label} reach` });

  return chips;
}
