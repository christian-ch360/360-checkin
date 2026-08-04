import "server-only";

import type { Prisma, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function listProjects(organizationId: string, filters: { status?: ProjectStatus; search?: string } = {}) {
  const where: Prisma.ProjectWhereInput = {
    organizationId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { projectCode: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      brand: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      projectLeader: { select: { id: true, fullName: true, profilePhotoUrl: true } },
      _count: { select: { assignments: true } },
    },
  });
}

// Creator Dashboard's Projects tab — strictly personal, scoped by memberId
// (mirrors my-analytics.service.ts's pattern), unlike listProjects above
// which lists every org project regardless of who's assigned.
export async function listMyProjects(memberId: string) {
  const assignments = await prisma.projectAssignment.findMany({
    where: { memberId },
    orderBy: { assignedAt: "desc" },
    include: {
      project: {
        include: {
          brand: { select: { id: true, name: true } },
          assignments: { include: { member: { select: { id: true, fullName: true } } } },
        },
      },
    },
  });

  return assignments.map((a) => ({
    id: a.project.id,
    projectCode: a.project.projectCode,
    name: a.project.name,
    brand: a.project.brand ? a.project.brand.name : null,
    team: a.project.assignments.map((m) => m.member.fullName),
    status: a.project.status,
    gmv: a.project.gmv,
  }));
}

export async function getProjectDetail(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    include: {
      brand: true,
      client: true,
      projectLeader: true,
      qrAsset: true,
      assignments: {
        include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true, memberNumber: true, role: true } } },
        orderBy: { assignedAt: "asc" },
      },
      tasks: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, take: 20 },
      files: { orderBy: { createdAt: "desc" } },
      invitations: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" } },
      collaborationRequests: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true, role: true } } },
      },
    },
  });

  if (!project) return null;

  const [gmvTransactions, commissionTransactions] = await Promise.all([
    prisma.gMVTransaction.findMany({
      where: { projectId },
      orderBy: { transactionDate: "desc" },
      take: 30,
      include: { member: { select: { fullName: true } } },
    }),
    prisma.commissionTransaction.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { member: { select: { fullName: true } } },
    }),
  ]);

  return { project, gmvTransactions, commissionTransactions };
}

export async function listOrgMembers(organizationId: string) {
  return prisma.member.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, role: true, profilePhotoUrl: true },
  });
}

export async function listOrgBrandsAndClients(organizationId: string) {
  const [brands, companies] = await Promise.all([
    prisma.brand.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.company.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { brands, companies };
}
