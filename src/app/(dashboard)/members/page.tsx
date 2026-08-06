import { requireCurrentMember } from "@/features/auth/services/current-member";
import { listMembers, listCompaniesForOrg, listCommissionTiersForOrg } from "@/features/members/services/members.service";
import { getSocialSummaryForMembers } from "@/features/integrations/services/social-connections.service";
import { MembersTable, type MemberRow } from "@/features/members/components/members-table";
import { MembersMobileList } from "@/features/members/components/members-mobile-list";
import { MembersFilters } from "@/features/members/components/members-filters";
import { Pagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { hasPermission } from "@/lib/permissions";
import { isDemoModeActive, demoListMembers } from "@/features/demo-data";
import type { MemberRole, MemberStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Members" };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; role?: string; status?: string }>;
}) {
  const actor = await requireCurrentMember();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filters = {
    search: params.search,
    role: params.role as MemberRole | undefined,
    status: params.status as MemberStatus | undefined,
  };

  const [{ members, total, pageCount, pageSize }, companies, commissionTiers] = await Promise.all([
    isDemoModeActive(actor)
      ? Promise.resolve(demoListMembers(filters, { page, pageSize: 25 }))
      : listMembers(actor.organizationId, filters, { page, pageSize: 25 }),
    listCompaniesForOrg(actor.organizationId),
    listCommissionTiersForOrg(actor.organizationId),
  ]);

  // One batched query for the whole page — demo member IDs simply won't
  // match any real social_connections rows, so this is harmless under demo mode.
  const socialSummaries = await getSocialSummaryForMembers(members.map((m) => m.id));

  const rows: MemberRow[] = members.map((m) => ({
    id: m.id,
    memberNumber: m.memberNumber,
    fullName: m.fullName,
    email: m.email,
    role: m.role,
    status: m.status,
    profilePhotoUrl: m.profilePhotoUrl,
    currentGMV: m.currentGMV.toString(),
    hoursWorked: m.hoursWorked.toString(),
    company: m.company,
    commissionTier: m.commissionTier
      ? {
          code: m.commissionTier.code,
          name: m.commissionTier.name,
          percentage: m.commissionTier.percentage.toString(),
        }
      : null,
    socialSummary: socialSummaries[m.id] ?? [],
  }));

  return (
    <div className="space-y-8">
      <PageHeader title="Members" description={`${total} member${total === 1 ? "" : "s"} across your organization.`} />

      <MembersFilters
        companies={companies}
        commissionTiers={commissionTiers.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          percentage: t.percentage.toString(),
        }))}
        canManage={hasPermission(actor.systemRole, "members.manage")}
        canAssignAdminRoles={hasPermission(actor.systemRole, "roles.manage")}
      />

      <MembersTable data={rows} />
      <MembersMobileList data={rows} />

      <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} />
    </div>
  );
}
