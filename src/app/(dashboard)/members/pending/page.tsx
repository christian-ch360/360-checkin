import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { listPendingMembers } from "@/features/members/services/members.service";
import { PendingMembersTable, type PendingMemberRow } from "@/features/members/components/pending-members-table";
import { PendingMembersFilters } from "@/features/members/components/pending-members-filters";
import { Pagination } from "@/components/shared/pagination";
import type { MemberRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pending Members" };

export default async function PendingMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; role?: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.approve")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { members, total, pageCount, pageSize } = await listPendingMembers(
    actor.organizationId,
    { search: params.search, role: params.role as MemberRole | undefined },
    { page, pageSize: 25 }
  );

  const rows: PendingMemberRow[] = members.map((m) => ({
    id: m.id,
    memberNumber: m.memberNumber,
    fullName: m.fullName,
    email: m.email,
    phone: m.phone,
    role: m.role,
    profilePhotoUrl: m.profilePhotoUrl,
    company: m.company,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Pending Members</h1>
        <p className="text-sm text-muted-foreground">
          {total} application{total === 1 ? "" : "s"} awaiting review.
        </p>
      </div>

      <PendingMembersFilters />

      <PendingMembersTable data={rows} />

      <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} />
    </div>
  );
}
