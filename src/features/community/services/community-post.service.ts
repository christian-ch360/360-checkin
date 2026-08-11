import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { CommunityPostType, Prisma, ReactionEmoji } from "@prisma/client";

export type ReactionSummaryItem = { emoji: ReactionEmoji; count: number; reactedByMe: boolean };

async function getReactionSummariesByPost(postIds: string[], actorId: string) {
  if (postIds.length === 0) return new Map<string, ReactionSummaryItem[]>();

  const reactions = await prisma.reaction.findMany({
    where: { targetType: "POST", targetId: { in: postIds } },
    select: { targetId: true, emoji: true, memberId: true },
  });

  const byPost = new Map<string, Map<ReactionEmoji, ReactionSummaryItem>>();
  for (const r of reactions) {
    const forPost = byPost.get(r.targetId) ?? new Map<ReactionEmoji, ReactionSummaryItem>();
    const entry = forPost.get(r.emoji) ?? { emoji: r.emoji, count: 0, reactedByMe: false };
    entry.count += 1;
    if (r.memberId === actorId) entry.reactedByMe = true;
    forPost.set(r.emoji, entry);
    byPost.set(r.targetId, forPost);
  }

  return new Map(Array.from(byPost.entries()).map(([postId, map]) => [postId, Array.from(map.values())]));
}

export type CommunityFeedFilter = "newest" | "trending" | "following" | "my-posts" | "pinned" | "announcements";

const AUTHOR_SELECT = {
  id: true,
  fullName: true,
  username: true,
  profilePhotoUrl: true,
  systemRole: true,
  subscription: { select: { plan: { select: { name: true } } } },
} as const;

const POST_INCLUDE = {
  author: { select: AUTHOR_SELECT },
  attachments: true,
  hashtags: { include: { hashtag: true } },
  _count: { select: { comments: { where: { deletedAt: null } } } },
} as const;

/** Trending window — reactions/comments in the last 7 days count toward the score. */
const TRENDING_WINDOW_DAYS = 7;

export async function listCommunityPosts(
  organizationId: string,
  actorId: string,
  opts: { filter: CommunityFeedFilter; hashtag?: string | null }
) {
  const { filter, hashtag } = opts;

  const where: Prisma.CommunityPostWhereInput = {
    organizationId,
    deletedAt: null,
  };

  if (hashtag) {
    where.hashtags = { some: { hashtag: { tag: hashtag.toLowerCase() } } };
  }

  if (filter === "my-posts") {
    where.authorId = actorId;
  } else if (filter === "pinned") {
    where.isPinned = true;
  } else if (filter === "announcements") {
    where.type = "ANNOUNCEMENT" as CommunityPostType;
  } else if (filter === "following") {
    const following = await prisma.follow.findMany({ where: { followerId: actorId }, select: { followingId: true } });
    where.authorId = { in: following.map((f) => f.followingId) };
  }

  const posts = await prisma.communityPost.findMany({
    where,
    include: POST_INCLUDE,
    orderBy: filter === "pinned" || filter === "newest" || filter === "my-posts" || filter === "announcements"
      ? [{ isPinned: "desc" }, { createdAt: "desc" }]
      : { createdAt: "desc" },
    take: 100,
  });

  const postIds = posts.map((p) => p.id);
  const reactionSummaryByPost = await getReactionSummariesByPost(postIds, actorId);
  const reactionCountOf = (postId: string) =>
    (reactionSummaryByPost.get(postId) ?? []).reduce((sum, r) => sum + r.count, 0);

  const shaped = posts.map((p) => ({ ...p, reactions: reactionSummaryByPost.get(p.id) ?? [] }));

  if (filter !== "trending") return shaped;

  const windowStart = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return shaped
    .filter((p) => p.createdAt >= windowStart)
    .sort((a, b) => reactionCountOf(b.id) + b._count.comments - (reactionCountOf(a.id) + a._count.comments));
}

export type CommunityPostListItem = Awaited<ReturnType<typeof listCommunityPosts>>[number];

export async function getCommunityPost(organizationId: string, postId: string, actorId: string) {
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, organizationId },
    include: POST_INCLUDE,
  });
  if (!post) return null;

  const reactions = (await getReactionSummariesByPost([post.id], actorId)).get(post.id) ?? [];
  return { ...post, reactions };
}

const COMMENT_AUTHOR_SELECT = { id: true, fullName: true, profilePhotoUrl: true } as const;

/** Flat, chronological list — the client/UI nests it into a reply tree via parentId. */
export async function listCommunityComments(postId: string) {
  return prisma.communityComment.findMany({
    where: { postId },
    include: { author: { select: COMMENT_AUTHOR_SELECT } },
    orderBy: { createdAt: "asc" },
  });
}

export type CommunityCommentItem = Awaited<ReturnType<typeof listCommunityComments>>[number];

export async function searchCommunity(organizationId: string, query: string, actorId: string) {
  const q = query.trim();
  if (!q) return { posts: [], people: [], hashtags: [] };

  const [posts, people, hashtags] = await Promise.all([
    prisma.communityPost.findMany({
      where: { organizationId, deletedAt: null, body: { contains: q, mode: "insensitive" } },
      include: POST_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.member.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        OR: [{ fullName: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }],
      },
      select: { id: true, fullName: true, username: true, profilePhotoUrl: true },
      take: 10,
    }),
    prisma.hashtag.findMany({
      where: { organizationId, tag: { contains: q.toLowerCase() } },
      take: 10,
    }),
  ]);

  const reactionSummaryByPost = await getReactionSummariesByPost(posts.map((p) => p.id), actorId);
  return { posts: posts.map((p) => ({ ...p, reactions: reactionSummaryByPost.get(p.id) ?? [] })), people, hashtags };
}
