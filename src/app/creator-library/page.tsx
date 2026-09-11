import { cookies } from "next/headers";
import type { ContentCategory, SocialPlatform } from "@prisma/client";
import {
  LIBRARY_COOKIE_NAME,
  isLibraryAccessConfigured,
  verifyLibraryToken,
} from "@/features/creator-library/auth/session";
import {
  getLibraryStats,
  getPrimaryOrganizationId,
  listFeaturedCreators,
  listLibraryCategories,
  listLibraryCreators,
  listLibraryLocations,
  listLibraryReachTiers,
} from "@/features/creator-library/services/creator-library.service";
import { resolveLibrarySort } from "@/features/creator-library/config/library-config";
import { LibraryPasswordGate } from "@/features/creator-library/components/library-password-gate";
import { LibraryTopBar } from "@/features/creator-library/components/library-top-bar";
import { LibraryHero } from "@/features/creator-library/components/library-hero";
import { LibraryToolbar } from "@/features/creator-library/components/library-toolbar";
import { LibraryCategoryExplorer } from "@/features/creator-library/components/library-category-explorer";
import { LibraryFeaturedSection } from "@/features/creator-library/components/library-featured-section";
import {
  CreatorGrid,
  CreatorGridEmpty,
  LoadMore,
} from "@/features/creator-library/components/creator-grid";
import { LibraryCategoriesView } from "@/features/creator-library/components/library-categories-view";
import { LibraryFeaturedView } from "@/features/creator-library/components/library-featured-view";
import { LibraryLocationsView } from "@/features/creator-library/components/library-locations-view";
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
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <p className="text-sm text-muted-foreground">The Creator Network isn&apos;t available right now.</p>
        </div>
      </>
    );
  }

  if (view === "categories") {
    const categories = await listLibraryCategories(organizationId);
    return (
      <>
        <LibraryTopBar activeView="categories" />
        <LibraryCategoriesView categories={categories} />
      </>
    );
  }

  if (view === "locations") {
    const tree = await listLibraryLocations(organizationId);
    return (
      <>
        <LibraryTopBar activeView="locations" />
        <LibraryLocationsView tree={tree} />
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
    const creators = await listFeaturedCreators(organizationId, 12);
    return (
      <>
        <LibraryTopBar activeView="featured" />
        <LibraryFeaturedView creators={creators} />
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

  const [stats, categories, locationTree, result, featured] = await Promise.all([
    getLibraryStats(organizationId),
    listLibraryCategories(organizationId),
    listLibraryLocations(organizationId),
    listLibraryCreators(organizationId, filters),
    listFeaturedCreators(organizationId, 8),
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

  return (
    <>
      <LibraryTopBar activeView={null} />
      <LibraryHero stats={stats} collage={collage} />
      <LibraryToolbar categories={categories} locationTree={locationTree} resultCount={result.total} />

      {!hasAnyFilter ? (
        <>
          <LibraryCategoryExplorer categories={categories} />
          <LibraryFeaturedSection creators={featured} />
        </>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">All Creators</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Explore the full CH360 Creator Network.</p>
        </div>
        {result.items.length === 0 ? (
          <CreatorGridEmpty reason={stats.creators === 0 && !hasAnyFilter ? "empty-library" : "no-results"} />
        ) : (
          <>
            <CreatorGrid creators={result.items} />
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
      </main>
    </>
  );
}
