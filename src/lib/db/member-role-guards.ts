import "server-only";

import { prisma } from "@/lib/db/prisma";

/**
 * True when `excludeMemberId` is the org's only remaining Super Admin —
 * shared by the role-change and delete actions so both refuse to strip the
 * org of its last Super Admin.
 */
export async function isLastSuperAdmin(organizationId: string, excludeMemberId: string): Promise<boolean> {
  const otherSuperAdmins = await prisma.member.count({
    where: { organizationId, systemRole: "SUPER_ADMIN", deletedAt: null, id: { not: excludeMemberId } },
  });
  return otherSuperAdmins === 0;
}
