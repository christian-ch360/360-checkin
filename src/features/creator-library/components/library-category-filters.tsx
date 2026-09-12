import Link from "next/link";
import type { ContentCategory } from "@prisma/client";
import { cn } from "@/lib/utils";
import { categoryVisual } from "@/features/creator-library/config/category-visuals";
import type { LibraryCategoryCount } from "@/features/creator-library/services/creator-library.service";

/**
 * Compact category filter bar for the Creator Library home page. Categories
 * have no standalone page/route anymore — each pill is a plain link that
 * toggles `?category=` on this same page (other active filters like
 * location/reach preserved via `baseParams`), reusing the exact server-side
 * filtering `listLibraryCreators` already does — no separate client-side
 * filtering system. Clicking the active category again drops the param and
 * falls back to "All Creators". `scroll={false}` keeps the page from
 * jumping back to the top on every filter change.
 */
export function LibraryCategoryFilters({
  categories,
  activeCategory,
  baseParams,
}: {
  categories: LibraryCategoryCount[];
  activeCategory: ContentCategory | null;
  baseParams: Record<string, string>;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl bg-[#FAF9F6] px-4 py-6 sm:px-8">
      <p className="text-[0.7rem] font-medium tracking-[0.24em] text-[#B8935A] uppercase">Explore</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#161616]">Categories</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        <CategoryChip href={buildCategoryHref(baseParams, null)} label="All Creators" active={activeCategory === null} />
        {categories.map((entry) => {
          const active = activeCategory === entry.category;
          return (
            <CategoryChip
              key={entry.category}
              href={buildCategoryHref(baseParams, active ? null : entry.category)}
              label={entry.label}
              emoji={categoryVisual(entry.category).emoji}
              count={entry.count}
              active={active}
            />
          );
        })}
      </div>
    </section>
  );
}

function CategoryChip({
  href,
  label,
  emoji,
  count,
  active,
}: {
  href: string;
  label: string;
  emoji?: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
        active
          ? "border-[#161616] bg-[#161616] text-white"
          : "border-[#E8D5A3] bg-white text-[#161616] hover:border-[#D4AF6A] hover:bg-[#F5F1E8]",
      )}
    >
      {emoji ? (
        <span aria-hidden className="text-[0.9em]">
          {emoji}
        </span>
      ) : null}
      {label}
      {typeof count === "number" ? (
        <span className={active ? "text-white/70" : "text-[#6B6B6B]"}>({count})</span>
      ) : null}
    </Link>
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
