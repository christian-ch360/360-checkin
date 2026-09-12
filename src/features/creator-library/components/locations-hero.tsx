import { CreatorPortrait } from "@/features/creator-library/components/creator-portrait";
import { formatCompactNumber } from "@/lib/utils/format";

export type LocationsHeroCreator = { id: string; name: string; imageUrl: string | null };

/**
 * "Creators Around the World" hero — headline + real live stats on the
 * left, a premium editorial collage of real creator portraits (plus one
 * real location photo when we have one) on the right.
 *
 * The collage tiles are laid out with generous, non-overlapping gaps (each
 * tile's percentage box is computed so no two ever share space) rather than
 * heavy overlap — a curated arrangement, not stacked cards. The script
 * caption lives in normal document flow *below* the collage, never
 * absolutely positioned over it, so it can never be hidden or clipped and
 * needs no z-index to compete with the images.
 */
export function LocationsHero({
  creators,
  cityImage,
  stats,
}: {
  creators: LocationsHeroCreator[];
  cityImage: string | null;
  stats: { creators: number; countries: number; states: number; cities: number };
}) {
  const items = [
    { value: formatCompactNumber(stats.creators), label: stats.creators === 1 ? "Creator" : "Creators" },
    { value: stats.countries > 0 ? String(stats.countries) : "—", label: stats.countries === 1 ? "Country" : "Countries" },
    { value: stats.states > 0 ? String(stats.states) : "—", label: stats.states === 1 ? "State" : "States" },
    { value: stats.cities > 0 ? String(stats.cities) : "—", label: stats.cities === 1 ? "City" : "Cities" },
  ];

  const tiles = [creators[0] ?? null, creators[1] ?? null, creators[2] ?? null, cityImage].filter(
    (t) => t !== null,
  ) as (LocationsHeroCreator | string)[];

  return (
    <section className="bg-[#FAF9F6]">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1fr_1fr_auto] lg:items-center lg:gap-8 lg:py-16">
        <div className="lg:col-span-1">
          <p className="text-[0.7rem] font-medium tracking-[0.3em] text-[#B8935A] uppercase">CreatorHub360 Network</p>
          <h1 className="mt-4 text-[clamp(2.5rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-tight text-balance text-[#161616]">
            Creators Around
            <br />
            the <span className="text-[#B8935A]">World.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-[#6B6B6B] text-balance">
            Explore the cities and communities shaping the CreatorHub360 network.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 lg:mx-0 lg:max-w-md">
          {/* Editorial overlapping collage — sm and up. Each tile's box is
              sized so it never intersects another; only the rotation reads
              as "collage," not literal overlap. */}
          <div className="relative hidden aspect-square w-full sm:block">
            {tiles.map((tile, i) => (
              <CollageTile key={i} tile={tile} className={TILE_LAYOUT[i]} />
            ))}
          </div>

          {/* Mobile — a plain, non-overlapping 2x2 grid. No absolute
              positioning at this size, so nothing can clip or crowd. */}
          <div className="grid w-full grid-cols-2 gap-3 sm:hidden">
            {tiles.map((tile, i) => (
              <figure
                key={i}
                className="overflow-hidden rounded-2xl border border-[#E8D5A3] bg-white shadow-md shadow-black/10"
              >
                <div className="aspect-[4/5]">
                  {typeof tile === "string" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external editorial photo, app has no next/image remotePatterns and uses <img> for remote URLs everywhere
                    <img src={tile} alt="" className="size-full object-cover" />
                  ) : (
                    <CreatorPortrait name={tile.name} imageUrl={tile.imageUrl} seed={tile.id} rounded="rounded-none" />
                  )}
                </div>
              </figure>
            ))}
          </div>

          {/* Script caption — its own row below the collage, in normal
              flow. Never sits under an image, never needs a z-index. */}
          <p className="text-center text-xl italic leading-snug text-[#161616] [font-family:var(--font-script),cursive]">
            A global community
            <br />
            of creators.
          </p>
        </div>

        <dl className="flex gap-6 lg:flex-col lg:gap-5 lg:border-l lg:border-[#E8D5A3] lg:pl-8">
          {items.map((item) => (
            <div key={item.label}>
              <dd className="text-2xl font-semibold tracking-tight tabular-nums text-[#161616]">{item.value}</dd>
              <dt className="text-xs text-[#6B6B6B]">{item.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function CollageTile({ tile, className }: { tile: LocationsHeroCreator | string; className: string }) {
  return (
    <figure
      className={`absolute overflow-hidden rounded-2xl border border-[#E8D5A3] bg-white shadow-lg shadow-black/10 ${className}`}
    >
      <div className="aspect-[4/5]">
        {typeof tile === "string" ? (
          // eslint-disable-next-line @next/next/no-img-element -- external editorial photo, app has no next/image remotePatterns and uses <img> for remote URLs everywhere
          <img src={tile} alt="" className="size-full object-cover" />
        ) : (
          <CreatorPortrait name={tile.name} imageUrl={tile.imageUrl} seed={tile.id} rounded="rounded-none" />
        )}
      </div>
    </figure>
  );
}

// Percentage boxes (top/left/width, height implied by the 4:5 tile ratio on
// a square container) chosen so no two tiles' boxes ever intersect — the
// only "collage" effect comes from rotation and staggered placement. Order
// matches `tiles`: [creators[0], creators[1], creators[2], cityImage].
const TILE_LAYOUT = [
  "top-[4%] left-[2%] w-[34%] -rotate-2", // creators[0] — upper left
  "top-0 left-[62%] w-[34%] rotate-3", // creators[1] — upper right
  "top-[54%] left-[4%] w-[36%] rotate-2", // creators[2] — lower left
  "top-[50%] left-[58%] w-[36%] -rotate-3", // city image — lower right
];
