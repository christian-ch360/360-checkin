import Link from "next/link";
import { cn } from "@/lib/utils";
import { LibraryWordmark } from "@/features/creator-library/components/library-wordmark";
import { LibrarySearchControl } from "@/features/creator-library/components/library-search-control";
import { CampaignCta } from "@/features/creator-library/components/campaign-cta";
import { LibraryMobileNav } from "@/features/creator-library/components/library-mobile-nav";
import { LIBRARY_NAV_ITEMS, libraryNavHref } from "@/features/creator-library/config/library-nav-items";

/**
 * The CreatorHub360 Creator Network masthead — a fixed warm-ivory editorial
 * bar, independent of the app's light/dark theme (same rationale as the
 * password gate): a luxury fashion-site nav, not a SaaS dashboard header.
 * Wordmark left, discovery nav center (gold underline active state), search
 * right — no account/sign-out affordance; this surface is a shared-password
 * gate, not an authenticated account area.
 */
export function LibraryTopBar({ activeView }: { activeView: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#EAE1CB] bg-[#FAF9F6]">
      {/* `relative` so LibrarySearchControl's expanded overlay can cover
          this exact row (wordmark through icon) via `absolute inset-0`. */}
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-8">
        <Link href="/creator-library" className="shrink-0">
          <LibraryWordmark size="md" tone="fixed" stacked />
        </Link>

        <nav className="ml-6 hidden flex-1 items-center gap-6 lg:flex">
          {LIBRARY_NAV_ITEMS.map((item) => {
            const isActive = (item.view ?? null) === (activeView ?? null);
            return (
              <Link
                key={item.label}
                href={libraryNavHref(item)}
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

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <CampaignCta />
          <LibrarySearchControl />
          <LibraryMobileNav activeView={activeView} />
        </div>
      </div>
    </header>
  );
}
