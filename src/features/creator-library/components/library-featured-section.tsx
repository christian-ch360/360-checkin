import Link from "next/link";
import { CreatorCard } from "@/features/creator-library/components/creator-card";
import type { LibraryCreatorCard } from "@/features/creator-library/services/creator-library.service";

/**
 * Home-page "Featured Creators" band — a short slice of the hand-picked
 * selection with a link to the full Featured view. Hidden entirely when the
 * team hasn't featured anyone yet.
 */
export function LibraryFeaturedSection({
  creators,
  placeholderIconUrl,
}: {
  creators: LibraryCreatorCard[];
  placeholderIconUrl?: string | null;
}) {
  if (creators.length === 0) return null;

  return (
    <section className="border-y border-[#EAE1CB] bg-[#F5F1E8]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#161616] sm:text-3xl">
              <span aria-hidden className="text-[#D4AF6A]">★</span> Featured Creators
            </h2>
            <p className="mt-1.5 text-sm text-[#6B6B6B]">Exceptional talent from the CreatorHub360 network.</p>
          </div>
          <Link
            href="/creator-library?view=featured"
            className="shrink-0 text-xs font-medium text-[#B8935A] hover:underline"
          >
            View All →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {creators.slice(0, 4).map((creator, index) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              priority={index < 2}
              placeholderIconUrl={placeholderIconUrl}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
