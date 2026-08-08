import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getCachedSpacesDashboardData } from "@/features/spaces/services/spaces.service";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/permissions";
import { SpaceFormDialog } from "@/features/spaces/components/space-form";
import { SpacesDashboard } from "@/features/spaces/components/spaces-dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { SPACE_CATEGORY_LABELS } from "@/lib/utils/space-category";
import { isDemoModeActive, demoGetCachedSpacesDashboardData } from "@/features/demo-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Spaces" };

export default async function SpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; space?: string; category?: string }>;
}) {
  const actor = await requireCurrentMember();
  const canManage = hasPermission(actor.systemRole, "spaces.manage");
  const canDelete = hasPermission(actor.systemRole, "spaces.delete");
  const { filter, space: initialSpaceId, category } = await searchParams;
  const initialStatusFilter =
    filter === "available" || filter === "occupied" || filter === "my-bookings" || filter === "favorites"
      ? filter
      : null;
  const initialCategory = category && category in SPACE_CATEGORY_LABELS ? (category as keyof typeof SPACE_CATEGORY_LABELS) : null;

  const [spaces, projects, members] = await Promise.all([
    isDemoModeActive(actor) ? Promise.resolve(demoGetCachedSpacesDashboardData()) : getCachedSpacesDashboardData(actor.organizationId),
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Spaces"
        description="Browse availability and book a space across the campus."
        actions={canManage && <SpaceFormDialog />}
      />

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
    </div>
  );
}
