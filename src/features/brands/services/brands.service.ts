import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function listBrands(organizationId: string) {
  return prisma.brand.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { projects: true } },
    },
  });
}

/** For the Agency Dashboard's Brands section — a brand "belongs" to an agency once they share a campaign, contract, invoice, or invitation. */
export async function listBrandsForAgency(organizationId: string, agencyId: string) {
  return prisma.brand.findMany({
    where: {
      organizationId,
      OR: [
        { campaigns: { some: { agencyId } } },
        { contracts: { some: { agencyId } } },
        { invoices: { some: { agencyId } } },
        { brandInvitations: { some: { agencyId } } },
      ],
    },
    orderBy: { name: "asc" },
    include: {
      company: { select: { id: true, name: true } },
      brandContacts: { select: { id: true, fullName: true, email: true } },
      _count: { select: { campaigns: true, contracts: true, invoices: true } },
    },
  });
}

export async function getBrandDetail(organizationId: string, brandId: string) {
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, organizationId },
    include: {
      company: true,
      qrAsset: true,
      projects: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, status: true, gmv: true } },
    },
  });
  if (!brand) return null;

  const gmvAgg = await prisma.gMVTransaction.aggregate({
    where: { brandId },
    _sum: { amount: true },
  });

  return { brand, totalGMV: Number(gmvAgg._sum.amount ?? 0) };
}
