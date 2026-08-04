import "server-only";

import type { MemberRole, ContentCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type CollabFilters = {
  search?: string;
  role?: MemberRole;
  availableOnly?: boolean;
  skill?: string;
  category?: ContentCategory;
};

export async function listCollabMembers(organizationId: string, filters: CollabFilters = {}) {
  const where: Prisma.MemberWhereInput = {
    organizationId,
    status: "ACTIVE",
    visibleInDirectory: true,
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.availableOnly ? { availableForCollab: true } : {}),
    ...(filters.skill ? { skills: { has: filters.skill } } : {}),
    ...(filters.category ? { contentCategories: { has: filters.category } } : {}),
    ...(filters.search
      ? {
          OR: [
            { fullName: { contains: filters.search, mode: "insensitive" } },
            { bio: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.member.findMany({
    where,
    orderBy: [{ availableForCollab: "desc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      role: true,
      profilePhotoUrl: true,
      bio: true,
      skills: true,
      availableForCollab: true,
      company: { select: { name: true } },
    },
  });
}

export async function listAllSkills(organizationId: string) {
  const members = await prisma.member.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { skills: true },
  });
  const set = new Set<string>();
  for (const m of members) for (const s of m.skills) set.add(s);
  return Array.from(set).sort();
}
