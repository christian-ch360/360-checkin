import "server-only";

import { prisma } from "@/lib/db/prisma";

/** Trending = most posts tagged in the last 14 days, computed at query time. */
export async function listTrendingHashtags(organizationId: string, limit = 10) {
  const windowStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const rows = await prisma.communityPostHashtag.groupBy({
    by: ["hashtagId"],
    where: { post: { organizationId, deletedAt: null, createdAt: { gte: windowStart } } },
    _count: { _all: true },
    orderBy: { _count: { hashtagId: "desc" } },
    take: limit,
  });

  if (rows.length === 0) return [];

  const hashtags = await prisma.hashtag.findMany({ where: { id: { in: rows.map((r) => r.hashtagId) } } });
  const countById = new Map(rows.map((r) => [r.hashtagId, r._count._all]));

  return hashtags
    .map((h) => ({ ...h, postCount: countById.get(h.id) ?? 0 }))
    .sort((a, b) => b.postCount - a.postCount);
}
