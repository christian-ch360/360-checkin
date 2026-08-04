import "server-only";

import type { FeedbackStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function listAllFeedback(organizationId: string, status?: FeedbackStatus) {
  return prisma.feedback.findMany({
    where: { organizationId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
  });
}

export async function listMyFeedback(memberId: string) {
  return prisma.feedback.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFeedbackCounts(organizationId: string) {
  const [open, inReview, resolved] = await Promise.all([
    prisma.feedback.count({ where: { organizationId, status: "OPEN" } }),
    prisma.feedback.count({ where: { organizationId, status: "IN_REVIEW" } }),
    prisma.feedback.count({ where: { organizationId, status: "RESOLVED" } }),
  ]);
  return { open, inReview, resolved };
}
