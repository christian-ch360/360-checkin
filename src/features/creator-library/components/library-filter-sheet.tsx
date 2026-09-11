"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import type { ContentCategory } from "@prisma/client";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FOLLOWER_BUCKETS,
  LIBRARY_PLATFORMS,
  PLATFORM_LABELS,
} from "@/features/creator-library/config/library-config";
import { REACH_TIERS } from "@/features/creator-library/lib/reach";
import type {
  LibraryCategoryCount,
  LibraryLocationTree,
} from "@/features/creator-library/services/creator-library.service";

const FILTER_KEYS = ["platform", "followers", "category", "country", "state", "city", "reach"] as const;

/**
 * Spec §7 — the polished filter panel. Every choice is a URL param so results
 * are server-rendered and shareable; the sheet just stages edits and applies
 * them on "Show results".
 */
export function LibraryFilterSheet({
  categories,
  locationTree,
}: {
  categories: LibraryCategoryCount[];
  locationTree: LibraryLocationTree;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [platform, setPlatform] = useState<string | null>(null);
  const [followers, setFollowers] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [reach, setReach] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPlatform(searchParams.get("platform"));
    setFollowers(searchParams.get("followers"));
    setCategory(searchParams.get("category"));
    setCountry(searchParams.get("country"));
    setState(searchParams.get("state"));
    setCity(searchParams.get("city"));
    setReach(searchParams.get("reach"));
  }, [open, searchParams]);

  const activeCount = useMemo(
    () => FILTER_KEYS.filter((key) => searchParams.get(key)).length,
    [searchParams],
  );

  const countryNode = locationTree.find((c) => c.country === country) ?? null;
  const stateNode = countryNode?.states.find((s) => s.state === state) ?? null;

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    const next: Record<string, string | null> = { platform, followers, category, country, state, city, reach };
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`/creator-library?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  function clearAll() {
    setPlatform(null);
    setFollowers(null);
    setCategory(null);
    setCountry(null);
    setState(null);
    setCity(null);
    setReach(null);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="size-3.5" />
          Filters
          {activeCount > 0 ? (
            <span className="ml-0.5 grid size-4 place-items-center rounded-full bg-foreground text-[0.6rem] font-semibold text-background">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow the network by platform, reach, category, or location.</SheetDescription>
        </SheetHeader>

        <div className="space-y-7 px-4 pb-4">
          <FilterGroup label="Platform">
            <ChipRow>
              <FilterChip active={platform === null} onClick={() => setPlatform(null)}>
                All platforms
              </FilterChip>
              {LIBRARY_PLATFORMS.map((value) => (
                <FilterChip key={value} active={platform === value} onClick={() => setPlatform(value)}>
                  {PLATFORM_LABELS[value]}
                </FilterChip>
              ))}
            </ChipRow>
          </FilterGroup>

          <FilterGroup label="Reach tier">
            <ChipRow>
              <FilterChip active={reach === null} onClick={() => setReach(null)}>
                Any reach
              </FilterChip>
              {REACH_TIERS.map((tier) => (
                <FilterChip key={tier.key} active={reach === tier.key} onClick={() => setReach(tier.key)}>
                  {tier.label} <span className="ml-1 opacity-60">{tier.range}</span>
                </FilterChip>
              ))}
            </ChipRow>
          </FilterGroup>

          <FilterGroup label="Follower size">
            <ChipRow>
              <FilterChip active={followers === null} onClick={() => setFollowers(null)}>
                Any size
              </FilterChip>
              {FOLLOWER_BUCKETS.map((bucket) => (
                <FilterChip
                  key={bucket.value}
                  active={followers === bucket.value}
                  onClick={() => setFollowers(bucket.value)}
                >
                  {bucket.label}
                </FilterChip>
              ))}
            </ChipRow>
          </FilterGroup>

          <FilterGroup label="Creator category">
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">No categories yet.</p>
            ) : (
              <ChipRow>
                <FilterChip active={category === null} onClick={() => setCategory(null)}>
                  All categories
                </FilterChip>
                {categories.map((entry) => (
                  <FilterChip
                    key={entry.category}
                    active={category === entry.category}
                    onClick={() => setCategory(entry.category as ContentCategory)}
                  >
                    {entry.label}
                    <span className="ml-1 text-muted-foreground">{entry.count}</span>
                  </FilterChip>
                ))}
              </ChipRow>
            )}
          </FilterGroup>

          <FilterGroup label="Location">
            {locationTree.length === 0 ? (
              <p className="text-xs text-muted-foreground">No locations yet.</p>
            ) : (
              <div className="space-y-2">
                <ChipRow>
                  <FilterChip
                    active={country === null}
                    onClick={() => {
                      setCountry(null);
                      setState(null);
                      setCity(null);
                    }}
                  >
                    All countries
                  </FilterChip>
                  {locationTree.map((c) => (
                    <FilterChip
                      key={c.country}
                      active={country === c.country}
                      onClick={() => {
                        setCountry(c.country);
                        setState(null);
                        setCity(null);
                      }}
                    >
                      {c.country} <span className="ml-1 text-muted-foreground">{c.count}</span>
                    </FilterChip>
                  ))}
                </ChipRow>

                {countryNode ? (
                  <ChipRow>
                    <FilterChip
                      active={state === null}
                      onClick={() => {
                        setState(null);
                        setCity(null);
                      }}
                    >
                      All states
                    </FilterChip>
                    {countryNode.states.map((s) => (
                      <FilterChip
                        key={s.state}
                        active={state === s.state}
                        onClick={() => {
                          setState(s.state);
                          setCity(null);
                        }}
                      >
                        {s.state === "—" ? "Unspecified" : s.state}{" "}
                        <span className="ml-1 text-muted-foreground">{s.count}</span>
                      </FilterChip>
                    ))}
                  </ChipRow>
                ) : null}

                {stateNode ? (
                  <ChipRow>
                    <FilterChip active={city === null} onClick={() => setCity(null)}>
                      All cities
                    </FilterChip>
                    {stateNode.cities.map((ct) => (
                      <FilterChip key={ct.city} active={city === ct.city} onClick={() => setCity(ct.city)}>
                        {ct.city === "—" ? "Unspecified" : ct.city}{" "}
                        <span className="ml-1 text-muted-foreground">{ct.count}</span>
                      </FilterChip>
                    ))}
                  </ChipRow>
                ) : null}
              </div>
            )}
          </FilterGroup>
        </div>

        <SheetFooter className="flex-row gap-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={clearAll} className="flex-1">
            Clear all
          </Button>
          <SheetClose asChild>
            <Button size="sm" onClick={apply} className="flex-[2]">
              Show results
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
