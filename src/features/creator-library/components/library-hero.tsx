import { formatCompactNumber } from "@/lib/utils/format";
import type { LibraryStats } from "@/features/creator-library/services/creator-library.service";
import { LibraryHeroCollage, type CollageCreator } from "@/features/creator-library/components/library-hero-collage";

/**
 * The CH360 Creator Network hero. Left: oversized editorial headline + live
 * statistics computed from real data. Right: an editorial collage of creator
 * portraits + the "Creators Build What's Next" mark.
 */
export function LibraryHero({ stats, collage }: { stats: LibraryStats; collage: CollageCreator[] }) {
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
    <section className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-6 lg:py-20">
        <div>
          <p className="text-[0.7rem] font-medium tracking-[0.3em] text-muted-foreground uppercase">
            CH360 Creator Network
          </p>
          <h1 className="mt-4 text-[clamp(2.75rem,6vw,4.75rem)] font-semibold leading-[0.95] tracking-tight text-balance">
            The <span className="font-bold">CH360</span>
            <br />
            Creator Network
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground text-balance">
            Discover the creators behind the network.
          </p>

          {hasData ? (
            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-4">
              {items.map((item) => (
                <div key={item.label}>
                  <dt className="sr-only">{item.label}</dt>
                  <dd className="text-3xl font-semibold tracking-tight tabular-nums sm:text-[2rem]">{item.value}</dd>
                  <p className="mt-1 text-[0.65rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    {item.label}
                  </p>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <LibraryHeroCollage creators={collage} />
      </div>
    </section>
  );
}
