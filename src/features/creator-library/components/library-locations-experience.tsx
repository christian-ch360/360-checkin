import { MapPin } from "lucide-react";
import { LocationsHero, type LocationsHeroCreator } from "@/features/creator-library/components/locations-hero";
import { CreatorLocationMap } from "@/features/creator-library/components/creator-location-map";
import { LocationExplorer } from "@/features/creator-library/components/location-explorer";
import { LocationBreakdown } from "@/features/creator-library/components/location-breakdown";
import { NetworkInsights } from "@/features/creator-library/components/network-insights";
import { locationImage } from "@/features/creator-library/config/location-images";
import type { LibraryLocationOverview } from "@/features/creator-library/services/creator-library.service";

/**
 * The full "Creators Around the World" Locations experience — a premium
 * editorial page built entirely from real Creator Library data (real
 * counts, real creator portraits, real city/state/country hierarchy). The
 * world map is a stylized, decorative silhouette (not surveyed geography);
 * markers are placed with real geocoded coordinates.
 */
export function LibraryLocationsExperience({
  overview,
  heroCreators,
}: {
  overview: LibraryLocationOverview;
  heroCreators: LocationsHeroCreator[];
}) {
  const topLocation = overview.summaries[0] ?? null;
  const cityImage = topLocation ? locationImage(topLocation.label) ?? locationImage(topLocation.state) : null;

  if (overview.totalCreators === 0) {
    return (
      <div className="bg-[#FAF9F6]">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-8">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#F5F1E8] text-[#B8935A]">
            <MapPin className="size-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-[#161616]">No locations yet</h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Creators need a Country / State / City on their profile before they show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F6]">
      <LocationsHero
        creators={heroCreators}
        cityImage={cityImage}
        stats={{ creators: overview.totalCreators, countries: overview.countries, states: overview.states, cities: overview.cities }}
      />

      <div className="mx-auto max-w-[1400px] px-4 pb-10 sm:px-8">
        <CreatorLocationMap summaries={overview.summaries} totalCreators={overview.totalCreators} />
      </div>

      <div className="mx-auto max-w-[1400px] space-y-10 px-4 pb-16 sm:px-8">
        <LocationExplorer summaries={overview.summaries} />

        <div className="grid gap-6 lg:grid-cols-3">
          <LocationBreakdown tree={overview.tree} />
          <NetworkInsights totalCreators={overview.totalCreators} topLocationLabel={topLocation?.label ?? null} />
          <QuoteCard />
        </div>
      </div>
    </div>
  );
}

function QuoteCard() {
  return (
    <div className="flex flex-col justify-center rounded-3xl border border-[#EAE1CB] bg-[#F5F1E8] p-6">
      <span aria-hidden className="text-4xl leading-none text-[#D4AF6A]">
        &ldquo;
      </span>
      <p className="mt-1 text-lg italic leading-snug text-[#161616] [font-family:var(--font-script),cursive]">
        A global network
        <br />
        of creators, building
        <br />
        a brighter tomorrow.
      </p>
    </div>
  );
}
