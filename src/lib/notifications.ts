import "server-only";

import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type NotifyInput = {
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
};

/** Create a single notification for one member. */
export async function createNotification(memberId: string, input: NotifyInput) {
  return prisma.notification.create({ data: { memberId, ...input } });
}

/** Create the same notification for many members (e.g. a "post closed" fan-out). */
export async function notifyMembers(memberIds: string[], input: NotifyInput) {
  if (memberIds.length === 0) return { count: 0 };
  return prisma.notification.createMany({
    data: memberIds.map((memberId) => ({ memberId, ...input })),
  });
}

/** Compact unread-count + recent-titles summary for the Dashboard Overview card. */
export async function getNotificationsSummary(memberId: string) {
  const [unreadCount, recent] = await Promise.all([
    prisma.notification.count({ where: { memberId, readAt: null } }),
    prisma.notification.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { id: true, title: true, link: true },
    }),
  ]);
  return { unreadCount, recent };
}
