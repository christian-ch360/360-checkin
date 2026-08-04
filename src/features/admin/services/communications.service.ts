import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function getEmailHistory(organizationId: string, take = 100) {
  return prisma.emailLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    include: { member: { select: { id: true, fullName: true } } },
  });
}
