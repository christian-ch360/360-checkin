import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function getCollabProfileStats(organizationId: string, memberId: string) {
  const [posts, receivedApplications, acceptedAsApplicant] = await Promise.all([
    prisma.collabPost.findMany({
      where: { organizationId, memberId },
      select: { status: true, expiresAt: true },
    }),
    prisma.application.findMany({
      where: { collabPost: { organizationId, memberId } },
      select: { createdAt: true, respondedAt: true },
    }),
    prisma.application.count({
      where: { applicantId: memberId, status: "ACCEPTED" },
    }),
  ]);

  const now = new Date();
  const open = posts.filter((p) => p.status === "OPEN" && (!p.expiresAt || p.expiresAt >= now)).length;
  const completed = posts.filter((p) => p.status === "FILLED").length;
  const past = posts.filter(
    (p) => p.status === "CLOSED" || (p.status === "OPEN" && p.expiresAt !== null && p.expiresAt < now)
  ).length;

  const responded = receivedApplications.filter((a) => a.respondedAt !== null);
  const responseRate = receivedApplications.length ? responded.length / receivedApplications.length : null;
  const avgResponseMs = responded.length
    ? responded.reduce((sum, a) => sum + (a.respondedAt!.getTime() - a.createdAt.getTime()), 0) / responded.length
    : null;

  return { open, past, completed, acceptedAsApplicant, responseRate, avgResponseMs };
}
