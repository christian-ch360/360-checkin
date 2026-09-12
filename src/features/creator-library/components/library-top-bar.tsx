import Link from "next/link";
import { LogOut, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { exitLibraryAction } from "@/features/creator-library/auth/actions";
import { LibraryWordmark } from "@/features/creator-library/components/library-wordmark";

const NAV_ITEMS: { label: string; view: string | null }[] = [
  { label: "Creators", view: null },
  { label: "Locations", view: "locations" },
  { label: "Reach", view: "reach" },
  { label: "Featured", view: "featured" },
];

/**
 * The CreatorHub360 Creator Network masthead — a fixed warm-ivory editorial
 * bar, independent of the app's light/dark theme (same rationale as the
 * password gate): a luxury fashion-site nav, not a SaaS dashboard header.
 * Wordmark left, discovery nav center (gold underline active state), Sign
 * Out right.
 */
export function LibraryTopBar({ activeView }: { activeView: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#EAE1CB] bg-[#FAF9F6]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-8">
        <Link href="/creator-library" className="shrink-0">
          <LibraryWordmark size="md" tone="fixed" stacked />
        </Link>

        <nav className="ml-6 hidden flex-1 items-center gap-6 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = (item.view ?? null) === (activeView ?? null);
            return (
              <Link
                key={item.label}
                href={item.view ? `/creator-library?view=${item.view}` : "/creator-library"}
                className={cn(
                  "relative py-1.5 text-sm font-medium transition-colors",
                  isActive ? "text-[#161616]" : "text-[#6B6B6B] hover:text-[#161616]",
                )}
              >
                {item.label}
                {isActive ? (
                  <span aria-hidden className="absolute inset-x-0 -bottom-[1px] h-[2px] rounded-full bg-[#D4AF6A]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/creator-library"
            aria-label="Search creators"
            className="flex size-8 items-center justify-center rounded-full text-[#6B6B6B] transition-colors hover:bg-[#161616]/5 hover:text-[#161616]"
          >
            <Search className="size-4" />
          </Link>
          <form action={exitLibraryAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#161616]/15 px-3.5 py-1.5 text-xs font-medium text-[#161616] transition-colors hover:bg-[#161616] hover:text-white"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
          </form>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-[#EAE1CB] px-4 py-2 lg:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = (item.view ?? null) === (activeView ?? null);
          return (
            <Link
              key={item.label}
              href={item.view ? `/creator-library?view=${item.view}` : "/creator-library"}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.16em] transition-colors",
                isActive ? "bg-[#161616] text-white" : "text-[#6B6B6B]",
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
