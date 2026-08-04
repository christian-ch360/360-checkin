import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function listCompanies(organizationId: string) {
  const companies = await prisma.company.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true, brands: true, projects: true } },
    },
  });
  return companies;
}

export async function getCompanyDetail(organizationId: string, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId },
    include: {
      brands: { orderBy: { name: "asc" } },
      members: { orderBy: { fullName: "asc" }, select: { id: true, fullName: true, role: true, profilePhotoUrl: true, currentGMV: true } },
      projects: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, status: true, gmv: true } },
    },
  });
  if (!company) return null;

  const gmvAgg = await prisma.gMVTransaction.aggregate({
    where: { companyId },
    _sum: { amount: true },
  });

  return { company, totalGMV: Number(gmvAgg._sum.amount ?? 0) };
}
