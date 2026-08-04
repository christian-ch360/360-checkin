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
