import Link from "next/link";
import { CreatorCard } from "@/features/creator-library/components/creator-card";
import type { LibraryCreatorCard } from "@/features/creator-library/services/creator-library.service";

/**
 * Home-page "Featured Creators" band — a short slice of the hand-picked
 * selection with a link to the full Featured view. Hidden entirely when the
 * team hasn't featured anyone yet.
 */
export function LibraryFeaturedSection({ creators }: { creators: LibraryCreatorCard[] }) {
  if (creators.length === 0) return null;

  return (
    <section className="border-y border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.7rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">Hand-picked</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">Featured Creators</h2>
          </div>
          <Link
            href="/creator-library?view=featured"
            className="shrink-0 text-xs font-medium text-[var(--community)] hover:underline"
          >
            View All →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {creators.slice(0, 4).map((creator, index) => (
            <CreatorCard key={creator.id} creator={creator} priority={index < 2} />
          ))}
        </div>
      </div>
    </section>
  );
}
