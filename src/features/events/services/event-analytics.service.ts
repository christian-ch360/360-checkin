import "server-only";

import { prisma } from "@/lib/db/prisma";

/** Fire-and-forget — a stuck counter is never worth failing a page render over. */
export async function incrementEventView(eventId: string): Promise<void> {
  try {
    await prisma.event.update({ where: { id: eventId }, data: { viewCount: { increment: 1 } } });
  } catch (err) {
    console.error("incrementEventView: failed to increment", err);
  }
}

export async function getEventAnalytics(organizationId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId },
    select: { id: true, viewCount: true, capacity: true, endTime: true },
  });
  if (!event) return null;

  const [rsvpCounts, checkInCount] = await Promise.all([
    prisma.eventRsvp.groupBy({ by: ["status"], where: { eventId }, _count: { status: true } }),
    prisma.eventCheckIn.count({ where: { eventId } }),
  ]);

  const rsvps = { GOING: 0, MAYBE: 0, NOT_GOING: 0, WAITLISTED: 0 };
  for (const row of rsvpCounts) rsvps[row.status] = row._count.status;

  const hasEnded = event.endTime < new Date();
  const noShows = hasEnded ? Math.max(0, rsvps.GOING - checkInCount) : null;

  return {
    views: event.viewCount,
    rsvps,
    checkedIn: checkInCount,
    capacity: event.capacity,
    capacityUtilization: event.capacity ? Math.round((rsvps.GOING / event.capacity) * 100) : null,
    noShows,
    attendanceRate: hasEnded && rsvps.GOING > 0 ? Math.round((checkInCount / rsvps.GOING) * 100) : null,
  };
}

export type EventAnalytics = NonNullable<Awaited<ReturnType<typeof getEventAnalytics>>>;

/** Org-wide Admin Event Manager analytics — the 10-metric rollup from the spec's Analytics section. */
export async function getOrgEventAnalytics(organizationId: string) {
  const now = new Date();

  const [totalEvents, upcomingCount, completedEvents, allRsvps, allCheckIns, categoryGroups] = await Promise.all([
    prisma.event.count({ where: { organizationId, status: "PUBLISHED" } }),
    prisma.event.count({ where: { organizationId, status: "PUBLISHED", startTime: { gt: now } } }),
    prisma.event.findMany({
      where: { organizationId, status: "PUBLISHED", endTime: { lt: now } },
      select: { id: true, capacity: true, hostName: true, viewCount: true },
    }),
    prisma.eventRsvp.count({ where: { event: { organizationId, status: "PUBLISHED" } } }),
    prisma.eventCheckIn.findMany({
      where: { event: { organizationId, status: "PUBLISHED" } },
      select: { memberId: true, eventId: true },
    }),
    prisma.event.groupBy({
      by: ["category"],
      where: { organizationId, status: "PUBLISHED" },
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
    }),
  ]);

  const completedIds = new Set(completedEvents.map((e) => e.id));
  const checkInsPerCompletedEvent = new Map<string, number>();
  const checkInsPerMember = new Map<string, number>();
  for (const c of allCheckIns) {
    if (completedIds.has(c.eventId)) {
      checkInsPerCompletedEvent.set(c.eventId, (checkInsPerCompletedEvent.get(c.eventId) ?? 0) + 1);
    }
    checkInsPerMember.set(c.memberId, (checkInsPerMember.get(c.memberId) ?? 0) + 1);
  }

  const averageAttendance = completedEvents.length
    ? Math.round(
        [...checkInsPerCompletedEvent.values()].reduce((sum, n) => sum + n, 0) / completedEvents.length
      )
    : 0;

  const repeatAttendees = [...checkInsPerMember.values()].filter((n) => n > 1).length;
  const totalCheckIns = allCheckIns.length;
  const totalViews = completedEvents.reduce((sum, e) => sum + e.viewCount, 0);

  const hostCounts = new Map<string, number>();
  for (const e of completedEvents) {
    const host = e.hostName ?? "Unknown host";
    hostCounts.set(host, (hostCounts.get(host) ?? 0) + 1);
  }
  const topHosts = [...hostCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hostName, eventCount]) => ({ hostName, eventCount }));

  return {
    totalEvents,
    upcomingCount,
    completedCount: completedEvents.length,
    totalRsvps: allRsvps,
    totalCheckIns,
    averageAttendance,
    repeatAttendees,
    totalViews,
    popularCategories: categoryGroups.map((g) => ({ category: g.category, count: g._count.category })),
    topHosts,
  };
}

export type OrgEventAnalytics = Awaited<ReturnType<typeof getOrgEventAnalytics>>;
