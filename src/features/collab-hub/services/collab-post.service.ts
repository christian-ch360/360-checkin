import "server-only";

import type { CollabPostCategory, CollabBudgetType, CollabPostStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function listCollabPosts(
  organizationId: string,
  filters: {
    category?: CollabPostCategory;
    budgetType?: CollabBudgetType;
    status?: CollabPostStatus;
    search?: string;
  } = {},
  viewerId?: string
) {
  const now = new Date();
  const status = filters.status ?? "OPEN";

  const posts = await prisma.collabPost.findMany({
    where: {
      organizationId,
      status,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.budgetType ? { budgetType: filters.budgetType } : {}),
      ...(status === "OPEN" ? { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] } : {}),
      ...(filters.search
        ? {
            AND: [
              {
                OR: [
                  { title: { contains: filters.search, mode: "insensitive" as const } },
                  { description: { contains: filters.search, mode: "insensitive" as const } },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          profilePhotoUrl: true,
          role: true,
          company: { select: { name: true } },
        },
      },
      _count: { select: { applications: true, likes: true } },
    },
  });

  if (!viewerId) return posts.map((p) => ({ ...p, hasApplied: false, hasLiked: false }));

  const [appliedPostIds, likedPostIds] = await Promise.all([
    prisma.application
      .findMany({
        where: { applicantId: viewerId, collabPostId: { in: posts.map((p) => p.id) } },
        select: { collabPostId: true },
      })
      .then((rows) => new Set(rows.map((a) => a.collabPostId))),
    prisma.collabPostLike
      .findMany({
        where: { memberId: viewerId, collabPostId: { in: posts.map((p) => p.id) } },
        select: { collabPostId: true },
      })
      .then((rows) => new Set(rows.map((l) => l.collabPostId))),
  ]);

  return posts.map((p) => ({ ...p, hasApplied: appliedPostIds.has(p.id), hasLiked: likedPostIds.has(p.id) }));
}

export async function getCollabPostById(organizationId: string, postId: string, viewerId?: string) {
  const post = await prisma.collabPost.findFirst({
    where: { id: postId, organizationId },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          profilePhotoUrl: true,
          role: true,
          company: { select: { name: true } },
        },
      },
      applications: {
        orderBy: { createdAt: "desc" },
        include: { applicant: { select: { id: true, fullName: true, profilePhotoUrl: true, role: true } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
      },
      _count: { select: { likes: true } },
    },
  });
  if (!post) return null;

  const hasLiked = viewerId
    ? Boolean(await prisma.collabPostLike.findUnique({ where: { collabPostId_memberId: { collabPostId: postId, memberId: viewerId } } }))
    : false;

  return { ...post, hasLiked };
}

// Creator Dashboard's Collaborations tab — strictly personal, scoped by
// memberId. Combines posts the member created and applications they
// submitted, bucketed to mirror the counts already computed by
// getCollabProfileStats (collab-profile.service.ts), but returning the
// actual records instead of just counts:
//   Open      = own posts, status OPEN
//   Pending   = own applications, status PENDING
//   Accepted  = own applications, status ACCEPTED
//   Completed = own posts, status FILLED
export async function listMyCollaborations(memberId: string) {
  const [ownPosts, ownApplications] = await Promise.all([
    prisma.collabPost.findMany({
      where: { memberId, status: { in: ["OPEN", "FILLED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, createdAt: true, _count: { select: { applications: true } } },
    }),
    prisma.application.findMany({
      where: { applicantId: memberId, status: { in: ["PENDING", "ACCEPTED"] } },
      orderBy: { createdAt: "desc" },
      include: { collabPost: { select: { id: true, title: true } } },
    }),
  ]);

  return {
    open: ownPosts
      .filter((p) => p.status === "OPEN")
      .map((p) => ({ id: p.id, title: p.title, createdAt: p.createdAt, applicationCount: p._count.applications })),
    pending: ownApplications
      .filter((a) => a.status === "PENDING")
      .map((a) => ({ id: a.id, title: a.collabPost.title, createdAt: a.createdAt })),
    accepted: ownApplications
      .filter((a) => a.status === "ACCEPTED")
      .map((a) => ({ id: a.id, title: a.collabPost.title, createdAt: a.createdAt })),
    completed: ownPosts
      .filter((p) => p.status === "FILLED")
      .map((p) => ({ id: p.id, title: p.title, createdAt: p.createdAt, applicationCount: p._count.applications })),
  };
}

export async function getCollabPostCounts(organizationId: string) {
  const [open, closed, filled] = await Promise.all([
    prisma.collabPost.count({ where: { organizationId, status: "OPEN" } }),
    prisma.collabPost.count({ where: { organizationId, status: "CLOSED" } }),
    prisma.collabPost.count({ where: { organizationId, status: "FILLED" } }),
  ]);
  return { open, closed, filled };
}
