import Link from "next/link";
import { LogOut, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { exitLibraryAction } from "@/features/creator-library/auth/actions";
import { LibraryWordmark } from "@/features/creator-library/components/library-wordmark";

const NAV_ITEMS: { label: string; view: string | null }[] = [
  { label: "Creators", view: null },
  { label: "Categories", view: "categories" },
  { label: "Locations", view: "locations" },
  { label: "Reach", view: "reach" },
  { label: "Featured", view: "featured" },
];

/**
 * The CH360 Creator Network masthead — a fixed charcoal editorial bar (a
 * deliberate brand element from the concept; it sits on both the warm light
 * body and the dark body and reads the same). Wordmark left, discovery nav
 * center, Sign Out right.
 */
export function LibraryTopBar({ activeView }: { activeView: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950 text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-8">
        <Link href="/creator-library" className="shrink-0">
          <LibraryWordmark size="md" tone="invert" stacked />
        </Link>

        <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = (item.view ?? null) === (activeView ?? null);
            return (
              <Link
                key={item.label}
                href={item.view ? `/creator-library?view=${item.view}` : "/creator-library"}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.16em] transition-colors",
                  isActive ? "bg-white text-neutral-950" : "text-white/55 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/creator-library#search"
            aria-label="Search creators"
            className="flex size-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Search className="size-4" />
          </Link>
          <form action={exitLibraryAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
          </form>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 lg:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = (item.view ?? null) === (activeView ?? null);
          return (
            <Link
              key={item.label}
              href={item.view ? `/creator-library?view=${item.view}` : "/creator-library"}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.16em] transition-colors",
                isActive ? "bg-white text-neutral-950" : "text-white/55",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
