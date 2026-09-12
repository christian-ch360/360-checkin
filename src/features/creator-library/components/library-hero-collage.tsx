import { CreatorPortrait } from "@/features/creator-library/components/creator-portrait";

export type CollageCreator = { id: string; name: string; imageUrl: string | null };

/**
 * Premium editorial creator collage for the hero — overlapping, softly
 * rotated portrait tiles (real photos when they exist, branded gradient
 * fallbacks otherwise) with the "Creators Build What's Next" script mark.
 * When Ops has uploaded a hero image (Creator Library Settings), it takes
 * the largest, gold-bordered tile; the remaining tiles are seeded from real
 * featured/top creators, falling back to unlabeled placeholder tiles when
 * the library is still empty.
 */

const PLACEHOLDERS: CollageCreator[] = [
  { id: "creatorhub360-collage-1", name: "CreatorHub360", imageUrl: null },
  { id: "creatorhub360-collage-2", name: "Creator Network", imageUrl: null },
  { id: "creatorhub360-collage-3", name: "CreatorHub360", imageUrl: null },
  { id: "creatorhub360-collage-4", name: "CreatorHub360 Ops", imageUrl: null },
];

// Position/size/rotation per tile slot, largest-and-lowest z first so later
// (smaller) tiles layer on top — a Vogue-style overlapping arrangement.
const SLOTS = [
  "left-0 top-4 w-[52%] -rotate-3 z-10",
  "right-0 top-0 w-[40%] rotate-6 z-20",
  "left-[10%] bottom-0 w-[42%] rotate-2 z-30",
  "right-2 bottom-6 w-[36%] -rotate-6 z-20",
];

export function LibraryHeroCollage({
  creators,
  heroImageUrl,
  placeholderIconUrl,
}: {
  creators: CollageCreator[];
  heroImageUrl?: string | null;
  placeholderIconUrl?: string | null;
}) {
  const hasHeroImage = Boolean(heroImageUrl);
  const slotCount = hasHeroImage ? 3 : 4;
  const source = creators.length > 0 ? creators : PLACEHOLDERS;
  const rest = source.slice(0, slotCount);
  while (rest.length < slotCount) rest.push(PLACEHOLDERS[rest.length]);

  const tiles: { key: string; imageUrl: string | null; name: string; gold: boolean }[] = hasHeroImage
    ? [
        { key: "hero-image", imageUrl: heroImageUrl ?? null, name: "CreatorHub360 Creator Network", gold: true },
        ...rest.map((c) => ({ key: c.id, imageUrl: c.imageUrl, name: c.name, gold: false })),
      ]
    : rest.map((c, i) => ({ key: c.id, imageUrl: c.imageUrl, name: c.name, gold: i === 1 }));

  return (
    // The script caption lives in its own reserved band below the tile
    // square (not layered on top of any photo), so it's guaranteed legible
    // regardless of what a given creator's portrait looks like — no
    // z-index/contrast gamble against real photography.
    <div className="mx-auto w-full max-w-xs lg:mx-0 lg:max-w-[25rem]">
      <div className="relative aspect-square">
        {tiles.map((tile, i) => (
          <figure
            key={tile.key}
            className={`absolute ${SLOTS[i]} overflow-hidden rounded-2xl border bg-white shadow-lg shadow-black/10 ${
              tile.gold ? "border-[#D4AF6A]" : "border-[#EAE1CB]"
            }`}
          >
            <div className="aspect-[4/5]">
              {tile.key === "hero-image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded Supabase URL, app has no next/image remotePatterns
                <img src={tile.imageUrl ?? undefined} alt="" className="size-full object-cover" />
              ) : (
                <CreatorPortrait
                  name={tile.name}
                  imageUrl={tile.imageUrl}
                  seed={tile.key}
                  placeholderIconUrl={placeholderIconUrl}
                  rounded="rounded-none"
                />
              )}
            </div>
          </figure>
        ))}
      </div>

      <div className="mt-2 flex flex-col items-center gap-1 text-center">
        <span className="h-px w-8 bg-[#D4AF6A]" aria-hidden />
        <p className="text-lg leading-tight text-[#161616] [font-family:var(--font-script),cursive] sm:text-xl">
          Creators Build What&rsquo;s Next
        </p>
      </div>
    </div>
  );
}
