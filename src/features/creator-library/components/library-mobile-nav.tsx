"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LibraryWordmark } from "@/features/creator-library/components/library-wordmark";
import { LIBRARY_NAV_ITEMS, libraryNavHref } from "@/features/creator-library/config/library-nav-items";

/**
 * A proper mobile drawer — not the desktop nav squeezed onto a phone. Below
 * `lg:`, the horizontally-scrolling pill row is gone entirely; a hamburger
 * opens this full-height panel instead, built on the existing Sheet
 * primitive with the fixed warm-ivory palette (overriding its default
 * theme-token colors, same approach as CampaignUnavailableModal used).
 * Imports the nav items/href-builder directly from a plain shared module
 * rather than receiving them as props — a Server Component (LibraryTopBar)
 * can't pass a function prop across the boundary to this Client Component.
 */
export function LibraryMobileNav({ activeView }: { activeView: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex size-11 items-center justify-center rounded-full text-[#161616] transition-colors hover:bg-[#161616]/5 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[85vw] max-w-sm gap-0 border-l border-[#EAE1CB] bg-[#FAF9F6] p-0 text-[#161616] sm:max-w-sm"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-[#EAE1CB] px-5 py-4">
          <SheetTitle asChild>
            <LibraryWordmark size="sm" tone="fixed" />
          </SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              aria-label="Close menu"
              className="flex size-11 items-center justify-center rounded-full text-[#6B6B6B] transition-colors hover:bg-[#161616]/5 hover:text-[#161616]"
            >
              <span aria-hidden className="text-xl leading-none">
                &times;
              </span>
            </button>
          </SheetClose>
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {LIBRARY_NAV_ITEMS.map((item) => {
            const isActive = (item.view ?? null) === (activeView ?? null);
            return (
              <SheetClose asChild key={item.label}>
                <Link
                  href={libraryNavHref(item)}
                  className={cn(
                    "flex min-h-12 items-center rounded-xl px-4 text-base font-medium transition-colors",
                    isActive ? "bg-[#161616] text-white" : "text-[#161616] hover:bg-[#F5F1E8]",
                  )}
                >
                  {item.label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        <div className="border-t border-[#EAE1CB] p-4">
          <SheetClose asChild>
            <Link
              href="/creator-library/campaigns/new"
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#D4AF6A] bg-white text-sm font-medium text-[#161616] transition-colors hover:bg-[#F5F1E8]"
            >
              <Sparkles className="size-4 text-[#B8935A]" aria-hidden />
              Request a Campaign
            </Link>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
