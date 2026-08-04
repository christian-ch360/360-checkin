import "server-only";

import { prisma } from "@/lib/db/prisma";

/**
 * Strictly personal — every query is scoped by memberId (never
 * organizationId), so this can never accidentally surface a company-wide
 * aggregate the way an admin's Operations Summary does.
 */
export async function getMyAnalytics(memberId: string) {
  const [member, upcomingReservations, upcomingBookingsCount, personalProjectsCount, collaborationRequests, recentDirectMessages] =
    await Promise.all([
      prisma.member.findUniqueOrThrow({
        where: { id: memberId },
        select: { hoursWorked: true, currentGMV: true, currentCommission: true },
      }),
      prisma.reservation.findMany({
        where: { memberId, status: "CONFIRMED", startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        take: 5,
        select: { id: true, startTime: true, endTime: true, space: { select: { name: true } } },
      }),
      prisma.reservation.count({ where: { memberId, status: "CONFIRMED", startTime: { gte: new Date() } } }),
      prisma.projectAssignment.count({ where: { memberId, status: "ACTIVE" } }),
      prisma.application.count({ where: { status: "PENDING", collabPost: { memberId } } }),
      prisma.directMessage.findMany({
        where: { conversation: { participants: { some: { memberId } } } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          body: true,
          type: true,
          createdAt: true,
          sender: { select: { id: true, fullName: true, profilePhotoUrl: true } },
        },
      }),
    ]);

  return {
    upcomingBookingsCount,
    hoursWorked: Number(member.hoursWorked),
    personalProjectsCount,
    personalGmv: Number(member.currentGMV),
    commissionEarned: Number(member.currentCommission),
    upcomingReservations: upcomingReservations.map((r) => ({
      id: r.id,
      spaceName: r.space.name,
      startTime: r.startTime,
      endTime: r.endTime,
    })),
    recentMessages: recentDirectMessages,
    collaborationRequests,
  };
}

export type MyAnalytics = Awaited<ReturnType<typeof getMyAnalytics>>;
