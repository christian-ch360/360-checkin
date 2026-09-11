import { CreatorPortrait } from "@/features/creator-library/components/creator-portrait";

export type CollageCreator = { id: string; name: string; imageUrl: string | null };

/**
 * Editorial creator collage for the hero. Overlapping, slightly rotated
 * portrait tiles (real photos when they exist, branded gradient fallbacks
 * otherwise) with the "Creators Build What's Next" script mark. Seeded from
 * real featured/top creators; falls back to unlabeled placeholder tiles when
 * the library is still empty.
 */

const PLACEHOLDERS: CollageCreator[] = [
  { id: "ch360-collage-1", name: "CH360", imageUrl: null },
  { id: "ch360-collage-2", name: "Creator Network", imageUrl: null },
  { id: "ch360-collage-3", name: "CreatorHub360", imageUrl: null },
  { id: "ch360-collage-4", name: "CH360 Ops", imageUrl: null },
];

const TILES = [
  "left-0 top-2 w-[46%] -rotate-6 z-10",
  "right-1 top-0 w-[42%] rotate-3 z-20",
  "left-[14%] bottom-1 w-[44%] rotate-2 z-30",
  "right-0 bottom-4 w-[40%] -rotate-3 z-10",
];

export function LibraryHeroCollage({ creators }: { creators: CollageCreator[] }) {
  const source = creators.length > 0 ? creators : PLACEHOLDERS;
  const tiles = source.slice(0, 4);
  while (tiles.length < 4) tiles.push(PLACEHOLDERS[tiles.length]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md lg:mx-0 lg:max-w-none">
      {tiles.map((creator, i) => (
        <figure
          key={creator.id}
          className={`absolute ${TILES[i]} overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/10`}
        >
          <div className="aspect-[4/5]">
            <CreatorPortrait name={creator.name} imageUrl={creator.imageUrl} seed={creator.id} rounded="rounded-none" />
          </div>
        </figure>
      ))}

      <p className="absolute -bottom-2 left-1/2 z-40 -translate-x-1/2 rotate-[-4deg] text-center text-3xl text-foreground [font-family:var(--font-script),cursive] sm:text-4xl">
        Creators Build
        <br />
        What&rsquo;s Next
      </p>
    </div>
  );
}
