import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryVisual } from "@/features/creator-library/config/category-visuals";
import type { LibraryCategoryCount } from "@/features/creator-library/services/creator-library.service";

/**
 * "CATEGORIES" view — data-driven: only the categories creators in the library
 * actually use, each a soft pastel card linking into the filtered grid.
 */
export function LibraryCategoriesView({ categories }: { categories: LibraryCategoryCount[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
      <p className="text-[0.7rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">Browse by</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Categories</h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Every content category represented across the CH360 Creator Network.
      </p>

      {categories.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No categories yet — creators need to be published with content categories first.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((entry) => {
            const visual = categoryVisual(entry.category);
            return (
              <Link
                key={entry.category}
                href={`/creator-library?category=${entry.category}`}
                className={cn(
                  "group flex h-36 flex-col justify-between rounded-2xl border border-border p-4 transition-transform hover:-translate-y-0.5",
                  visual.tint,
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl" aria-hidden>
                    {visual.emoji}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold leading-tight", visual.text)}>{entry.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.count} creator{entry.count === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
