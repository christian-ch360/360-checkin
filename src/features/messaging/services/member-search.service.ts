import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function searchMembersForDm(organizationId: string, query: string, excludeMemberId: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.member.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      deletedAt: null,
      id: { not: excludeMemberId },
      OR: [
        { fullName: { contains: trimmed, mode: "insensitive" } },
        { memberNumber: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, profilePhotoUrl: true, role: true, memberNumber: true },
    orderBy: { fullName: "asc" },
    take: 8,
  });
}

/** For @mention autocomplete (post/comment/DM composers) — matches on username, since that's what gets typed after "@". */
export async function searchMembersForMention(organizationId: string, query: string, excludeMemberId: string) {
  const trimmed = query.trim();

  return prisma.member.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      deletedAt: null,
      id: { not: excludeMemberId },
      username: { not: null, contains: trimmed, mode: "insensitive" },
    },
    select: { id: true, username: true, fullName: true, profilePhotoUrl: true },
    orderBy: { fullName: "asc" },
    take: 6,
  });
}
