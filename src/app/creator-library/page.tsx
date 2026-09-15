import { cookies } from "next/headers";
import type { ContentCategory, SocialPlatform } from "@prisma/client";
import {
  LIBRARY_COOKIE_NAME,
  isLibraryAccessConfigured,
  verifyLibraryToken,
} from "@/features/creator-library/auth/session";
import {
  getLibraryLocationOverview,
  getLibraryStats,
  getPrimaryOrganizationId,
  listFeaturedCreators,
  listLibraryCategories,
  listLibraryCreators,
  listLibraryReachTiers,
} from "@/features/creator-library/services/creator-library.service";
import { resolveLibrarySort } from "@/features/creator-library/config/library-config";
import { getLibrarySettings } from "@/features/creator-library/lib/library-settings";
import { LibraryPasswordGate } from "@/features/creator-library/components/library-password-gate";
import { LibraryTopBar } from "@/features/creator-library/components/library-top-bar";
import { LibraryHero } from "@/features/creator-library/components/library-hero";
import { LibraryCategoryControl } from "@/features/creator-library/components/library-category-control";
import { LibraryFeaturedSection } from "@/features/creator-library/components/library-featured-section";
import {
  CreatorGrid,
  CreatorGridEmpty,
  LoadMore,
} from "@/features/creator-library/components/creator-grid";
import { LibraryFeaturedView } from "@/features/creator-library/components/library-featured-view";
import { LibraryLocationsExperience } from "@/features/creator-library/components/library-locations-experience";
import { LibraryReachView } from "@/features/creator-library/components/library-reach-view";

export const dynamic = "force-dynamic";

type RawParams = Record<string, string | string[] | undefined>;

function str(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.trim() ? first.trim() : undefined;
}

export default async function CreatorLibraryPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const authed = await verifyLibraryToken(cookieStore.get(LIBRARY_COOKIE_NAME)?.value);

  if (!authed) {
    return <LibraryPasswordGate redirectTo={str(params.redirectTo)} configured={isLibraryAccessConfigured()} />;
  }

  const organizationId = await getPrimaryOrganizationId();
  const view = str(params.view) ?? null;

  if (!organizationId) {
    return (
      <>
        <LibraryTopBar activeView={view} />
        <div className="mx-auto max-w-6xl bg-[#FAF9F6] px-4 py-24 text-center sm:px-6">
          <p className="text-sm text-[#6B6B6B]">The Creator Network isn&apos;t available right now.</p>
        </div>
      </>
    );
  }

  if (view === "locations") {
    const [overview, topCreators] = await Promise.all([
      getLibraryLocationOverview(organizationId),
      listLibraryCreators(organizationId, { sort: "followers_desc", page: 1 }),
    ]);
    const heroCreators = topCreators.items
      .slice(0, 3)
      .map((creator) => ({ id: creator.id, name: creator.name, imageUrl: creator.imageUrl }));
    return (
      <>
        <LibraryTopBar activeView="locations" />
        <LibraryLocationsExperience overview={overview} heroCreators={heroCreators} />
      </>
    );
  }

  if (view === "reach") {
    const tiers = await listLibraryReachTiers(organizationId);
    return (
      <>
        <LibraryTopBar activeView="reach" />
        <LibraryReachView tiers={tiers} />
      </>
    );
  }

  if (view === "featured") {
    const [creators, settings] = await Promise.all([
      listFeaturedCreators(organizationId, 12),
      getLibrarySettings(organizationId),
    ]);
    return (
      <>
        <LibraryTopBar activeView="featured" />
        <LibraryFeaturedView creators={creators} placeholderIconUrl={settings.placeholderIconUrl} />
      </>
    );
  }

  const page = Math.max(1, Number(str(params.page) ?? "1") || 1);
  const filters = {
    search: str(params.search),
    platform: str(params.platform) as SocialPlatform | undefined,
    followerBucket: str(params.followers),
    category: str(params.category) as ContentCategory | undefined,
    country: str(params.country),
    state: str(params.state),
    city: str(params.city),
    reach: str(params.reach),
    sort: resolveLibrarySort(str(params.sort)),
    page,
  };

  const [stats, categories, result, featured, settings] = await Promise.all([
    getLibraryStats(organizationId),
    listLibraryCategories(organizationId),
    listLibraryCreators(organizationId, filters),
    listFeaturedCreators(organizationId, 8),
    getLibrarySettings(organizationId),
  ]);

  const collage = (featured.length > 0 ? featured : result.items)
    .slice(0, 4)
    .map((creator) => ({ id: creator.id, name: creator.name, imageUrl: creator.imageUrl }));

  const hasAnyFilter = Boolean(
    filters.search ||
      filters.platform ||
      filters.followerBucket ||
      filters.category ||
      filters.country ||
      filters.state ||
      filters.city ||
      filters.reach,
  );

  // Everything the category chips need to preserve when toggling a category
  // on/off — every other active filter, minus category itself and page (a
  // new filter always restarts pagination).
  const categoryBaseParams: Record<string, string> = {};
  if (filters.search) categoryBaseParams.search = filters.search;
  if (filters.platform) categoryBaseParams.platform = filters.platform;
  if (filters.followerBucket) categoryBaseParams.followers = filters.followerBucket;
  if (filters.country) categoryBaseParams.country = filters.country;
  if (filters.state) categoryBaseParams.state = filters.state;
  if (filters.city) categoryBaseParams.city = filters.city;
  if (filters.reach) categoryBaseParams.reach = filters.reach;
  const sortParam = str(params.sort);
  if (sortParam) categoryBaseParams.sort = sortParam;

  const activeCategoryLabel = filters.category
    ? (categories.find((entry) => entry.category === filters.category)?.label ?? null)
    : null;

  return (
    <>
      <LibraryTopBar activeView={null} />
      <LibraryHero
        stats={stats}
        collage={collage}
        heroImageUrl={settings.heroImageUrl}
        heroOverlayOpacity={settings.heroOverlayOpacity}
        placeholderIconUrl={settings.placeholderIconUrl}
      />
      <LibraryCategoryControl
        categories={categories}
        activeCategory={filters.category ?? null}
        baseParams={categoryBaseParams}
      />
      {!hasAnyFilter ? (
        <LibraryFeaturedSection creators={featured} placeholderIconUrl={settings.placeholderIconUrl} />
      ) : null}

      <main className="mx-auto max-w-7xl bg-[#FAF9F6] px-4 py-12 sm:px-8">
        <div key={filters.category ?? "all"} className="animate-in fade-in duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[#161616] sm:text-3xl">
              {activeCategoryLabel ? `${activeCategoryLabel} Creators` : "All Creators"}
            </h2>
            <p className="mt-1.5 text-sm text-[#6B6B6B]">
              {activeCategoryLabel
                ? `Explore ${activeCategoryLabel} creators in the CreatorHub360 Creator Network.`
                : "Explore the full CreatorHub360 Creator Network."}
            </p>
          </div>
          {result.items.length === 0 ? (
            <CreatorGridEmpty reason={stats.creators === 0 && !hasAnyFilter ? "empty-library" : "no-results"} />
          ) : (
            <>
              <CreatorGrid creators={result.items} placeholderIconUrl={settings.placeholderIconUrl} />
              <LoadMore
                currentPage={page}
                remaining={result.hasMore}
                searchParams={{
                  search: filters.search,
                  platform: filters.platform,
                  followers: filters.followerBucket,
                  category: filters.category,
                  country: filters.country,
                  state: filters.state,
                  city: filters.city,
                  reach: filters.reach,
                  sort: str(params.sort),
                }}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
