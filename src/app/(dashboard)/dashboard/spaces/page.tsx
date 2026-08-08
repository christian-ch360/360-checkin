import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getCachedSpacesDashboardData } from "@/features/spaces/services/spaces.service";
import { getOccupancy, getTodayBookingsCount } from "@/features/dashboard/services/dashboard.service";
import { getLocationOccupancy } from "@/features/locations/services/locations.service";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/permissions";
import { DashboardSummaryCards } from "@/features/dashboard/components/dashboard-summary-cards";
import { LocationOccupancyWidget } from "@/features/locations/components/location-occupancy-widget";
import { SpacesDashboard } from "@/features/spaces/components/spaces-dashboard";
import { SpacesCategorySummary } from "@/features/spaces/components/spaces-category-summary";
import { SPACE_CATEGORY_LABELS } from "@/lib/utils/space-category";

export const dynamic = "force-dynamic";

export default async function DashboardSpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; space?: string; category?: string }>;
}) {
  const actor = await requireCurrentMember();
  const canManage = hasPermission(actor.systemRole, "spaces.manage");
  const canDelete = hasPermission(actor.systemRole, "spaces.delete");
  const isAdminTier = hasPermission(actor.systemRole, "admin.access");
  const { filter, space: initialSpaceId, category } = await searchParams;
  const initialStatusFilter =
    filter === "available" || filter === "occupied" || filter === "my-bookings" || filter === "favorites"
      ? filter
      : null;
  const initialCategory = category && category in SPACE_CATEGORY_LABELS ? (category as keyof typeof SPACE_CATEGORY_LABELS) : null;

  const [spaces, locationOccupancy, membersCheckedIn, todayBookings, projects, members] = await Promise.all([
    getCachedSpacesDashboardData(actor.organizationId),
    getLocationOccupancy(actor.organizationId),
    getOccupancy(actor.organizationId),
    getTodayBookingsCount(actor.organizationId),
    prisma.project.findMany({
      where: { organizationId: actor.organizationId, status: { in: ["PLANNING", "ACTIVE"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.member.findMany({
      where: { organizationId: actor.organizationId, status: "ACTIVE" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  // Archived spaces aren't part of live inventory anymore — excluded from
  // both counts so an archived-but-empty space doesn't inflate "Available."
  const activeSpaces = spaces.filter((s) => s.isActive);
  const availableSpaces = activeSpaces.filter((s) => s.status === "AVAILABLE").length;
  const occupiedSpaces = activeSpaces.filter((s) => s.status === "OCCUPIED").length;

  return (
    <div className="space-y-8">
      <DashboardSummaryCards
        availableSpaces={availableSpaces}
        occupiedSpaces={occupiedSpaces}
        membersCheckedIn={membersCheckedIn}
        todayBookings={todayBookings}
      />

      <LocationOccupancyWidget locations={locationOccupancy} />

      {isAdminTier ? (
        <SpacesCategorySummary
          spaces={spaces}
          projects={projects}
          members={members}
          currentActorId={actor.id}
          canManage={canManage}
          canDelete={canDelete}
        />
      ) : (
        <SpacesDashboard
          spaces={spaces}
          projects={projects}
          members={members}
          currentActorId={actor.id}
          canManage={canManage}
          canDelete={canDelete}
          initialStatusFilter={initialStatusFilter}
          initialSpaceId={initialSpaceId ?? null}
          initialCategory={initialCategory}
        />
      )}
    </div>
  );
}
