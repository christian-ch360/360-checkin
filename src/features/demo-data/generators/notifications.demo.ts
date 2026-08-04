import "server-only";

import { getDemoUniverse } from "@/features/demo-data/seed/universe";

export function demoGetNotificationsSummary() {
  return getDemoUniverse().notifications;
}

export function demoListRecentNotifications() {
  const { notificationRows } = getDemoUniverse();
  return { notifications: notificationRows, unreadCount: notificationRows.filter((n) => n.readAt === null).length };
}
