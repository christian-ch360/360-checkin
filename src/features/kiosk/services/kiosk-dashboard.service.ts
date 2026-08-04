import "server-only";

import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { listThemes, computeDisplayStatus } from "@/features/kiosk/services/kiosk-theme.service";
import { resolveActiveTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";

/**
 * "Kiosk Dashboard — Current Active Theme, Upcoming Scheduled Themes,
 * Today's Event, Active Hero Banner, Active Sponsor, Active Announcement,
 * Theme Status, Last Edited By, Last Published." One aggregation query for
 * the Kiosk Manager's landing tab.
 */
export async function getKioskManagerDashboard(organizationId: string) {
  const now = new Date();
  const [allThemes, activeTheme, todaysEvent, activeAnnouncement] = await Promise.all([
    listThemes(organizationId),
    resolveActiveTheme(organizationId, now),
    prisma.event
      .findFirst({ where: { organizationId, status: "PUBLISHED", isFeatured: true } })
      .then(
        (featured) =>
          featured ??
          prisma.event.findFirst({
            where: { organizationId, status: "PUBLISHED", startTime: { gte: startOfDay(now) }, endTime: { lte: endOfDay(now) } },
            orderBy: { startTime: "asc" },
          })
      ),
    prisma.kioskAnnouncement.findFirst({
      where: {
        organizationId,
        status: "PUBLISHED",
        OR: [{ startDate: null }, { startDate: { lte: now } }],
      },
      orderBy: [{ isPinned: "desc" }, { priority: "desc" }],
    }),
  ]);

  const upcomingScheduled = allThemes
    .filter((t) => t.status === "PUBLISHED" && !t.isDefault && t.startDate > now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const themesWithStatus = allThemes.map((t) => ({ ...t, displayStatus: computeDisplayStatus(t, now) }));

  return {
    activeTheme,
    themes: themesWithStatus,
    upcomingScheduled,
    todaysEvent,
    activeAnnouncement,
  };
}
