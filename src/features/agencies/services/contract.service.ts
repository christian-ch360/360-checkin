import "server-only";

import { prisma } from "@/lib/db/prisma";

const CONTRACT_INCLUDE = {
  brand: { select: { id: true, name: true } },
  campaign: { select: { id: true, title: true } },
  creatorMember: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
  versions: { orderBy: { versionNumber: "desc" as const } },
} as const;

export async function listContracts(organizationId: string, agencyId: string) {
  return prisma.contract.findMany({
    where: { organizationId, agencyId },
    include: CONTRACT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export type ContractListItem = Awaited<ReturnType<typeof listContracts>>[number];

export async function getContract(organizationId: string, contractId: string) {
  return prisma.contract.findFirst({ where: { id: contractId, organizationId }, include: CONTRACT_INCLUDE });
}

/** "Expiration reminders" — always-current, no scheduler needed (see plan). */
export async function getExpiringContracts(organizationId: string, agencyId: string, daysAhead = 30) {
  const horizon = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return prisma.contract.findMany({
    where: {
      organizationId,
      agencyId,
      expiresAt: { not: null, lte: horizon, gte: new Date() },
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
    include: { brand: { select: { name: true } }, campaign: { select: { title: true } } },
    orderBy: { expiresAt: "asc" },
  });
}
