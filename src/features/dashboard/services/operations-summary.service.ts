import "server-only";

import { startOfDay } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { getTodayStats, getTodayBookingsCount, getRecentActivity } from "@/features/dashboard/services/dashboard.service";

/**
 * Plain exported function (not wrapped in a page component) so it can be
 * called from a future scheduled job (e.g. a daily email digest) without any
 * refactor — it takes only an organizationId and returns a serializable
 * summary, no request/response coupling.
 */
export async function getOperationsSummary(organizationId: string) {
  const startOfToday = startOfDay(new Date());

  const [
    todayStats,
    todayBookings,
    newApplications,
    pendingApprovals,
    unreadFeedback,
    recentCreatorActivity,
    recentDirectMessages,
  ] = await Promise.all([
    getTodayStats(organizationId),
    getTodayBookingsCount(organizationId),
    prisma.membershipApplication.count({ where: { organizationId, createdAt: { gte: startOfToday } } }),
    prisma.membershipApplication.count({ where: { organizationId, status: "PENDING" } }),
    prisma.feedback.count({ where: { organizationId, status: "OPEN" } }),
    getRecentActivity(organizationId, 5),
    prisma.directMessage.findMany({
      where: { conversation: { organizationId } },
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
    todayCheckIns: todayStats.checkIns,
    todayBookings,
    newApplications,
    pendingApprovals,
    unreadFeedback,
    recentCreatorActivity,
    recentMessages: recentDirectMessages,
  };
}

export type OperationsSummary = Awaited<ReturnType<typeof getOperationsSummary>>;
