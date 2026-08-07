import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import type { EventStatus } from "@prisma/client";

const EVENT_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
  space: { select: { id: true, name: true } },
  rsvps: { include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true } } } },
} as const;

async function listUpcomingEventsUncached(organizationId: string) {
  return prisma.event.findMany({
    where: { organizationId, status: "PUBLISHED", endTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
    include: EVENT_INCLUDE,
  });
}

const getCachedUpcomingEventsBundle = unstable_cache(
  (organizationId: string) => listUpcomingEventsUncached(organizationId),
  ["upcoming-events"],
  { revalidate: 15, tags: ["events"] }
);

/** Cached 15s per organization, same short window as getSpacesDashboardData — RSVP counts should feel close to live. */
export async function listUpcomingEvents(organizationId: string, take?: number) {
  const events = await getCachedUpcomingEventsBundle(organizationId);
  const revived = events.map((e) => ({
    ...e,
    startTime: new Date(e.startTime),
    endTime: new Date(e.endTime),
    createdAt: new Date(e.createdAt),
    updatedAt: new Date(e.updatedAt),
  }));
  return take ? revived.slice(0, take) : revived;
}

export async function listPastEvents(organizationId: string, take = 30) {
  return prisma.event.findMany({
    where: { organizationId, status: "PUBLISHED", endTime: { lt: new Date() } },
    orderBy: { startTime: "desc" },
    take,
    include: EVENT_INCLUDE,
  });
}

// Creator Dashboard's Events tab — strictly personal, scoped by memberId.
// Bucketing (no stored "upcoming/past" field on Event, so this is derived):
//   Upcoming  = future events RSVP'd GOING or MAYBE
//   Attending = the GOING subset of Upcoming (quick "what am I committed to")
//   Past      = concluded events with any RSVP
export async function listMyEvents(memberId: string) {
  const rsvps = await prisma.eventRsvp.findMany({
    where: { memberId },
    orderBy: { event: { startTime: "asc" } },
    include: { event: { select: { id: true, title: true, startTime: true, endTime: true, location: true } } },
  });

  const now = new Date();
  const upcoming = rsvps.filter((r) => r.event.endTime >= now && r.status !== "NOT_GOING");
  const attending = upcoming.filter((r) => r.status === "GOING");
  const past = rsvps
    .filter((r) => r.event.endTime < now)
    .sort((a, b) => b.event.startTime.getTime() - a.event.startTime.getTime());

  const toRow = (r: (typeof rsvps)[number]) => ({
    id: r.event.id,
    title: r.event.title,
    startTime: r.event.startTime,
    endTime: r.event.endTime,
    location: r.event.location,
    rsvpStatus: r.status,
  });

  return {
    upcoming: upcoming.map(toRow),
    attending: attending.map(toRow),
    past: past.map(toRow),
  };
}

export async function getEventDetail(organizationId: string, eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, organizationId },
    include: {
      ...EVENT_INCLUDE,
      checkIns: { select: { memberId: true, checkedInAt: true } },
      qrAsset: { select: { token: true } },
    },
  });
}

export type EventWithDetail = Awaited<ReturnType<typeof getEventDetail>>;

/** Single lightweight lookup for the event-logo fallback chain — see resolveEventLogoSrc(). */
export async function getOrganizationLogoUrl(organizationId: string): Promise<string | null> {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { logoUrl: true } });
  return organization?.logoUrl ?? null;
}

/** Member's own proposals across every status — powers the "My Proposals"/Drafts view on the events page. */
export async function listMyEventProposals(organizationId: string, memberId: string) {
  return prisma.event.findMany({
    where: { organizationId, createdById: memberId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { space: { select: { id: true, name: true } } },
  });
}

export const ADMIN_EVENT_TABS = ["pending", "upcoming", "live", "completed", "cancelled", "drafts"] as const;
export type AdminEventTab = (typeof ADMIN_EVENT_TABS)[number];

const ADMIN_TAB_INCLUDE = {
  createdBy: { select: { id: true, fullName: true, profilePhotoUrl: true } },
  space: { select: { id: true, name: true } },
  rsvps: { select: { status: true } },
  checkIns: { select: { memberId: true } },
} as const;

/** The 6-tab Admin Event Manager — status + time-bucket derived, mirroring the Kiosk theme's displayStatus pattern. */
export async function listEventsForAdminTab(organizationId: string, tab: AdminEventTab, now = new Date()) {
  const base = { organizationId, archivedAt: null } as const;

  switch (tab) {
    case "pending":
      return prisma.event.findMany({
        where: { ...base, status: "PENDING_APPROVAL" },
        orderBy: { submittedAt: "asc" },
        include: ADMIN_TAB_INCLUDE,
      });
    case "upcoming":
      return prisma.event.findMany({
        where: { ...base, status: "PUBLISHED", startTime: { gt: now } },
        orderBy: { startTime: "asc" },
        include: ADMIN_TAB_INCLUDE,
      });
    case "live":
      return prisma.event.findMany({
        where: { ...base, status: "PUBLISHED", startTime: { lte: now }, endTime: { gte: now } },
        orderBy: { startTime: "asc" },
        include: ADMIN_TAB_INCLUDE,
      });
    case "completed":
      return prisma.event.findMany({
        where: { ...base, status: "PUBLISHED", endTime: { lt: now } },
        orderBy: { startTime: "desc" },
        take: 100,
        include: ADMIN_TAB_INCLUDE,
      });
    case "cancelled":
      return prisma.event.findMany({
        where: { ...base, status: "CANCELLED" },
        orderBy: { cancelledAt: "desc" },
        take: 100,
        include: ADMIN_TAB_INCLUDE,
      });
    case "drafts":
      return prisma.event.findMany({
        where: { ...base, status: { in: ["DRAFT", "REJECTED"] } },
        orderBy: { updatedAt: "desc" },
        include: ADMIN_TAB_INCLUDE,
      });
  }
}

export async function getAdminEventTabCounts(organizationId: string, now = new Date()) {
  const base = { organizationId, archivedAt: null } as const;
  const [pending, upcoming, live, completed, cancelled, drafts] = await Promise.all([
    prisma.event.count({ where: { ...base, status: "PENDING_APPROVAL" } }),
    prisma.event.count({ where: { ...base, status: "PUBLISHED", startTime: { gt: now } } }),
    prisma.event.count({ where: { ...base, status: "PUBLISHED", startTime: { lte: now }, endTime: { gte: now } } }),
    prisma.event.count({ where: { ...base, status: "PUBLISHED", endTime: { lt: now } } }),
    prisma.event.count({ where: { ...base, status: "CANCELLED" } }),
    prisma.event.count({ where: { ...base, status: { in: ["DRAFT", "REJECTED"] } } }),
  ]);
  return { pending, upcoming, live, completed, cancelled, drafts };
}

export function computeEventTimeBucket(event: { status: EventStatus; startTime: Date; endTime: Date }, now = new Date()) {
  if (event.status === "PENDING_APPROVAL") return "pending" as const;
  if (event.status === "CANCELLED") return "cancelled" as const;
  if (event.status === "DRAFT" || event.status === "REJECTED") return "drafts" as const;
  if (event.startTime > now) return "upcoming" as const;
  if (event.endTime < now) return "completed" as const;
  return "live" as const;
}
