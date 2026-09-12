import { formatCompactNumber } from "@/lib/utils/format";
import type { LibraryStats } from "@/features/creator-library/services/creator-library.service";
import { LibraryHeroCollage, type CollageCreator } from "@/features/creator-library/components/library-hero-collage";

/**
 * The CreatorHub360 Creator Network hero — a bright, editorial two-column
 * banner on the fixed warm-ivory palette (independent of the app's
 * light/dark theme). Left: oversized headline + live stats with gold
 * separators. Right: a premium overlapping creator-portrait collage that
 * features the org's uploaded hero image (Creator Library Settings) when set.
 */
export function LibraryHero({
  stats,
  collage,
  heroImageUrl,
  placeholderIconUrl,
}: {
  stats: LibraryStats;
  collage: CollageCreator[];
  heroImageUrl?: string | null;
  heroOverlayOpacity?: number;
  placeholderIconUrl?: string | null;
}) {
  const hasData = stats.creators > 0;

  const items = [
    { value: formatCompactNumber(stats.creators), label: stats.creators === 1 ? "Creator" : "Creators" },
    {
      value: stats.combinedFollowers > 0 ? formatCompactNumber(stats.combinedFollowers) : "—",
      label: "Combined Reach",
    },
    {
      value: stats.countries > 0 ? formatCompactNumber(stats.countries) : "—",
      label: stats.countries === 1 ? "Country" : "Countries",
    },
    { value: stats.cities > 0 ? formatCompactNumber(stats.cities) : "—", label: stats.cities === 1 ? "City" : "Cities" },
  ];

  return (
    <section className="border-b border-[#EAE1CB] bg-[#FAF9F6]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-6 lg:py-6">
        <div>
          <p className="text-[0.7rem] font-medium tracking-[0.3em] text-[#B8935A] uppercase">
            CH360 Creator Network
          </p>
          <h1 className="mt-2 text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[0.95] tracking-tight text-balance text-[#161616]">
            The Creator
            <br />
            Network
          </h1>
          <p className="mt-2 max-w-md text-lg text-[#6B6B6B] text-balance">
            Discover the people, talent, and communities building what&rsquo;s next.
          </p>

          {hasData ? (
            <dl className="mt-4 flex max-w-lg flex-wrap gap-x-8 gap-y-3">
              {items.map((item, i) => (
                <div key={item.label} className={i > 0 ? "border-l border-[#E8D5A3] pl-8" : ""}>
                  <dt className="sr-only">{item.label}</dt>
                  <dd className="text-2xl font-semibold tracking-tight tabular-nums text-[#161616] sm:text-[1.75rem]">
                    {item.value}
                  </dd>
                  <p className="mt-1 text-[0.65rem] font-medium tracking-[0.16em] text-[#6B6B6B] uppercase">
                    {item.label}
                  </p>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <LibraryHeroCollage creators={collage} heroImageUrl={heroImageUrl} placeholderIconUrl={placeholderIconUrl} />
      </div>
    </section>
  );
}
