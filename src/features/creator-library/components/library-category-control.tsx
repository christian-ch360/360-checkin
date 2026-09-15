"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContentCategory } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryVisual } from "@/features/creator-library/config/category-visuals";
import type { LibraryCategoryCount } from "@/features/creator-library/services/creator-library.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Category is a FILTER on the Creator Library page, not a content section or
 * a destination — this is the single compact control that replaced the old
 * always-visible chip row. It renders two triggers for the same underlying
 * state (a desktop popover trigger, a mobile sheet trigger) toggled purely
 * via Tailwind breakpoints — no JS viewport detection — so exactly one is
 * ever clickable at a given width. Selecting a category still just navigates
 * `?category=` on this same page (server-filtered by `listLibraryCreators`,
 * same as before); there is no separate category page/route.
 */
export function LibraryCategoryControl({
  categories,
  activeCategory,
  baseParams,
}: {
  categories: LibraryCategoryCount[];
  activeCategory: ContentCategory | null;
  baseParams: Record<string, string>;
}) {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, setPending] = useState<ContentCategory | null>(activeCategory);

  if (categories.length === 0) return null;

  const activeLabel = activeCategory
    ? (categories.find((entry) => entry.category === activeCategory)?.label ?? null)
    : null;

  return (
    <section className="mx-auto max-w-7xl border-t border-[#EAE1CB] bg-[#FAF9F6] px-4 py-4 sm:px-8 sm:py-5">
      {/* Desktop: compact popover, hidden below sm. */}
      <Popover open={desktopOpen} onOpenChange={setDesktopOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={cn("hidden sm:inline-flex", triggerClass(Boolean(activeLabel)))}>
            <TriggerLabel activeLabel={activeLabel} />
            <ChevronDown className="size-4 shrink-0 text-[#6B6B6B]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-64 gap-1 rounded-2xl border border-[#EAE1CB] bg-[#FAF9F6] p-2 text-[#161616] shadow-lg ring-0"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[0.7rem] font-medium tracking-[0.2em] text-[#B8935A] uppercase">
            Categories
          </p>
          <div className="max-h-[26rem] overflow-y-auto">
            <CategoryOptionLink
              href={buildCategoryHref(baseParams, null)}
              label="All Categories"
              active={activeCategory === null}
              onNavigate={() => setDesktopOpen(false)}
            />
            {categories.map((entry) => (
              <CategoryOptionLink
                key={entry.category}
                href={buildCategoryHref(baseParams, entry.category)}
                label={entry.label}
                emoji={categoryVisual(entry.category).emoji}
                count={entry.count}
                active={activeCategory === entry.category}
                onNavigate={() => setDesktopOpen(false)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Mobile: bottom sheet with a draft selection + Done, hidden at sm+. */}
      <Sheet
        open={mobileOpen}
        onOpenChange={(next) => {
          setMobileOpen(next);
          if (next) setPending(activeCategory);
        }}
      >
        <SheetTrigger asChild>
          <button type="button" className={cn("inline-flex sm:hidden", triggerClass(Boolean(activeLabel)))}>
            <TriggerLabel activeLabel={activeLabel} />
            <ChevronDown className="size-4 shrink-0 text-[#6B6B6B]" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="gap-0 border-t border-[#EAE1CB] bg-[#FAF9F6] p-0 text-[#161616]">
          <SheetHeader className="border-b border-[#EAE1CB] px-5 pt-5 pb-4">
            <SheetTitle className="text-base font-semibold text-[#161616]">Categories</SheetTitle>
            <p className="text-sm text-[#6B6B6B]">Select a category</p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            <CategoryRadioRow
              label="All Categories"
              selected={pending === null}
              onClick={() => setPending(null)}
            />
            {categories.map((entry) => (
              <CategoryRadioRow
                key={entry.category}
                label={entry.label}
                emoji={categoryVisual(entry.category).emoji}
                count={entry.count}
                selected={pending === entry.category}
                onClick={() => setPending(entry.category)}
              />
            ))}
          </div>

          <div className="border-t border-[#EAE1CB] p-4">
            <Link
              href={buildCategoryHref(baseParams, pending)}
              scroll={false}
              onClick={() => setMobileOpen(false)}
              className="flex min-h-12 items-center justify-center rounded-full bg-[#161616] text-sm font-medium text-white transition-colors hover:bg-[#161616]/90"
            >
              Done
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function TriggerLabel({ activeLabel }: { activeLabel: string | null }) {
  if (!activeLabel) return <span>Categories</span>;
  return (
    <span>
      Categories <span className="text-[#B8935A]">· {activeLabel}</span>
    </span>
  );
}

function triggerClass(active: boolean): string {
  return cn(
    "min-h-11 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
    active
      ? "border-[#D4AF6A] bg-[#FBF3E3] text-[#161616]"
      : "border-[#EAE1CB] bg-white text-[#161616] hover:border-[#D4AF6A] hover:bg-[#F5F1E8]",
  );
}

function CategoryOptionLink({
  href,
  label,
  emoji,
  count,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  emoji?: string;
  count?: number;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onNavigate}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-[#161616] text-white" : "text-[#161616] hover:bg-[#F5F1E8]",
      )}
    >
      {emoji ? (
        <span aria-hidden className="text-[0.9em]">
          {emoji}
        </span>
      ) : null}
      <span className="flex-1">{label}</span>
      {typeof count === "number" ? (
        <span className={cn("text-xs", active ? "text-white/70" : "text-[#6B6B6B]")}>{count}</span>
      ) : null}
    </Link>
  );
}

function CategoryRadioRow({
  label,
  emoji,
  count,
  selected,
  onClick,
}: {
  label: string;
  emoji?: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors",
        selected ? "bg-[#F5F1E8] text-[#161616]" : "text-[#161616] hover:bg-[#F5F1E8]/60",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
          selected ? "border-[#B8935A]" : "border-[#D8CBAE]",
        )}
      >
        {selected ? <span className="size-2.5 rounded-full bg-[#B8935A]" /> : null}
      </span>
      {emoji ? (
        <span aria-hidden className="text-base">
          {emoji}
        </span>
      ) : null}
      <span className="flex-1">{label}</span>
      {typeof count === "number" ? <span className="text-xs text-[#6B6B6B]">{count}</span> : null}
    </button>
  );
}

function buildCategoryHref(baseParams: Record<string, string>, category: ContentCategory | null): string {
  const search = new URLSearchParams(baseParams);
  if (category) {
    search.set("category", category);
  } else {
    search.delete("category");
  }
  const qs = search.toString();
  return qs ? `/creator-library?${qs}` : "/creator-library";
}
