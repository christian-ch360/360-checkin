import { Star } from "lucide-react";
import { CreatorGrid } from "@/features/creator-library/components/creator-grid";
import type { LibraryCreatorCard } from "@/features/creator-library/services/creator-library.service";

/**
 * Spec §19 "FEATURED" view. Subtle treatment — a short intro line and the
 * same card grid, no loud badges beyond the small "Featured" marker the card
 * already carries.
 */
export function LibraryFeaturedView({ creators }: { creators: LibraryCreatorCard[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
      <p className="text-[0.7rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">Hand-picked</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Featured Creators</h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        A rotating selection from across the CH360 Creator Network, chosen by the CreatorHub360 team.
      </p>

      <div className="mt-8">
        {creators.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Star className="size-5" />
            </div>
            <p className="text-sm font-medium">No featured creators yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              The team hasn&apos;t featured anyone yet. Every creator is still browsable under Creators.
            </p>
          </div>
        ) : (
          <CreatorGrid creators={creators} />
        )}
      </div>
    </section>
  );
}
