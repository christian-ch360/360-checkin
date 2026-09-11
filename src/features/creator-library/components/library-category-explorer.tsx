import Link from "next/link";
import { cn } from "@/lib/utils";
import { categoryVisual } from "@/features/creator-library/config/category-visuals";
import type { LibraryCategoryCount } from "@/features/creator-library/services/creator-library.service";

/**
 * Horizontal category explorer — soft pastel cards (emoji + name + real creator
 * count) that link into the filtered grid. Data-driven: only categories that
 * creators in the library actually use appear.
 */
export function LibraryCategoryExplorer({ categories }: { categories: LibraryCategoryCount[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">Explore</p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">Categories</h2>
        </div>
        <Link
          href="/creator-library?view=categories"
          className="shrink-0 text-xs font-medium text-[var(--community)] hover:underline"
        >
          View All →
        </Link>
      </div>

      <div className="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((entry) => {
          const visual = categoryVisual(entry.category);
          return (
            <Link
              key={entry.category}
              href={`/creator-library?category=${entry.category}`}
              className={cn(
                "group flex w-40 shrink-0 snap-start flex-col justify-between rounded-2xl border border-border p-4 transition-transform hover:-translate-y-0.5",
                visual.tint,
              )}
            >
              <span className="text-2xl" aria-hidden>
                {visual.emoji}
              </span>
              <div className="mt-6">
                <p className={cn("text-sm font-semibold leading-tight", visual.text)}>{entry.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {entry.count} creator{entry.count === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
