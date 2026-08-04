import "server-only";

import { startOfDay } from "date-fns";
import { prisma } from "@/lib/db/prisma";

export function getWaitingVisitors(organizationId: string) {
  return prisma.visitor.findMany({
    where: { organizationId, status: "WAITING" },
    orderBy: { arrivedAt: "asc" },
  });
}

export function getOnSiteVisitors(organizationId: string) {
  return prisma.visitor.findMany({
    where: { organizationId, status: "APPROVED" },
    orderBy: { arrivedAt: "asc" },
  });
}

export function getTodayVisitorCount(organizationId: string) {
  return prisma.visitor.count({
    where: { organizationId, arrivedAt: { gte: startOfDay(new Date()) } },
  });
}

export function getRecentVisitors(organizationId: string, take = 25) {
  return prisma.visitor.findMany({
    where: { organizationId },
    orderBy: { arrivedAt: "desc" },
    take,
  });
}
