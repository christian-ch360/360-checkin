import Link from "next/link";
import { MapPin } from "lucide-react";
import { CreatorPortrait } from "@/features/creator-library/components/creator-portrait";
import { locationImage } from "@/features/creator-library/config/location-images";
import type { LibraryLocationSummary } from "@/features/creator-library/services/creator-library.service";

/** Premium horizontal location card — real photo when we have one curated for it, otherwise a warm gradient. */
export function LocationCard({ summary }: { summary: LibraryLocationSummary }) {
  const image = locationImage(summary.label) ?? locationImage(summary.state) ?? locationImage(summary.country);
  const subtitle = [summary.state, summary.country].filter(Boolean).join(", ") || summary.country;
  const extra = summary.count - summary.creators.length;

  const params = new URLSearchParams();
  params.set("country", summary.country);
  if (summary.state) params.set("state", summary.state);
  if (summary.city) params.set("city", summary.city);

  return (
    <Link
      href={`/creator-library?${params.toString()}`}
      className="group flex overflow-hidden rounded-3xl border border-[#EAE1CB] bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[#D4AF6A] hover:shadow-xl hover:shadow-black/10"
    >
      <div className="relative w-32 shrink-0 sm:w-40">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- external editorial photo, app has no next/image remotePatterns and uses <img> for remote URLs everywhere
          <img src={image} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-[radial-gradient(circle_at_30%_20%,#E8D5A3,#B8935A)]" />
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 p-4">
        <div>
          <p className="flex items-center gap-1.5 text-base font-semibold text-[#161616]">
            <MapPin className="size-3.5 shrink-0 text-[#B8935A]" />
            {summary.label}
          </p>
          <p className="text-xs text-[#6B6B6B]">{subtitle}</p>
        </div>
        <p className="text-sm font-medium text-[#8A6A2E]">
          {summary.count} Creator{summary.count === 1 ? "" : "s"}
        </p>
        <div className="flex items-center">
          {summary.creators.map((creator, i) => (
            <div
              key={creator.id}
              className="-ml-2 size-6 overflow-hidden rounded-full border-2 border-white first:ml-0"
              style={{ zIndex: summary.creators.length - i }}
            >
              <CreatorPortrait name={creator.name} imageUrl={creator.imageUrl} seed={creator.id} rounded="rounded-none" />
            </div>
          ))}
          {extra > 0 ? (
            <span className="-ml-2 grid size-6 place-items-center rounded-full border-2 border-white bg-[#F5F1E8] text-[0.6rem] font-semibold text-[#6B6B6B]">
              +{extra}
            </span>
          ) : null}
        </div>
        <span className="text-sm font-medium text-[#B8935A] transition-transform group-hover:translate-x-0.5">
          Explore Creators →
        </span>
      </div>
    </Link>
  );
}
