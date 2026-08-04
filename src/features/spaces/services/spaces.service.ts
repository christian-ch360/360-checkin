import "server-only";

import { differenceInMinutes } from "date-fns";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/db/activity-log";

export async function getSpaceDetail(organizationId: string, spaceId: string) {
  const space = await prisma.space.findFirst({
    where: { id: spaceId, organizationId },
    include: { qrAsset: true },
  });
  if (!space) return null;

  const [activeSession, history] = await Promise.all([
    prisma.spaceSession.findFirst({
      where: { spaceId, status: "IN_PROGRESS" },
      include: {
        member: { select: { id: true, fullName: true, profilePhotoUrl: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.spaceSession.findMany({
      where: { spaceId, status: { not: "IN_PROGRESS" } },
      orderBy: { startedAt: "desc" },
      take: 30,
      include: {
        member: { select: { id: true, fullName: true, profilePhotoUrl: true } },
        project: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { space, activeSession, history };
}

/**
 * A single member's next upcoming booking — used by the Dashboard Overview
 * tab, which no longer needs the full org-wide getSpacesDashboardData bundle
 * (that now lives behind the Spaces tab) just to find one row.
 */
export async function getMemberNextBooking(memberId: string) {
  const reservation = await prisma.reservation.findFirst({
    where: { memberId, status: "CONFIRMED", startTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
    include: { space: { select: { id: true, name: true } } },
  });
  if (!reservation) return null;
  return { spaceId: reservation.space.id, spaceName: reservation.space.name, startTime: reservation.startTime };
}

export async function endSpaceSession(
  sessionId: string,
  actor: { id: string; organizationId: string; canManageSpaces: boolean }
): Promise<{ error: string } | { session: Awaited<ReturnType<typeof prisma.spaceSession.update>> }> {
  const session = await prisma.spaceSession.findUnique({
    where: { id: sessionId },
    include: { space: true, member: true },
  });
  if (!session || session.space.organizationId !== actor.organizationId) {
    return { error: "Session not found" };
  }
  if (session.memberId !== actor.id && !actor.canManageSpaces) {
    return { error: "You don't have permission to end this session." };
  }
  if (session.status !== "IN_PROGRESS") return { error: "Session already ended" };

  const finishedAt = new Date();
  const durationMin = Math.max(1, differenceInMinutes(finishedAt, session.startedAt));

  const updated = await prisma.spaceSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", finishedAt, durationMin },
  });

  await logActivity({
    organizationId: session.member.organizationId,
    memberId: session.memberId,
    action: "space.finished",
    entityType: "space_session",
    entityId: session.id,
    metadata: { spaceName: session.space.name, durationMin },
  });

  return { session: updated };
}

export type SpaceStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";

/**
 * Combined feed for the Spaces dashboard: card-grid summary fields plus
 * everything the detail drawer needs, fetched once so opening a drawer is instant.
 */
export async function getSpacesDashboardData(organizationId: string) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const spaces = await prisma.space.findMany({
    where: { organizationId },
    include: {
      sessions: {
        where: { status: "IN_PROGRESS" },
        include: {
          member: { select: { id: true, fullName: true, profilePhotoUrl: true } },
          project: { select: { id: true, name: true } },
        },
        take: 1,
      },
      reservations: {
        where: { status: "CONFIRMED", endTime: { gte: startOfToday } },
        orderBy: { startTime: "asc" },
        include: {
          member: { select: { id: true, fullName: true, profilePhotoUrl: true } },
          project: { select: { id: true, name: true } },
          attendees: { select: { id: true, fullName: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return spaces.map((s) => {
    const activeSession = s.sessions[0] ?? null;
    const currentReservation = s.reservations.find((r) => r.startTime <= now && r.endTime >= now) ?? null;
    const nextReservation = s.reservations.find((r) => r.startTime > now) ?? null;
    const status: SpaceStatus = activeSession ? "OCCUPIED" : currentReservation ? "RESERVED" : "AVAILABLE";

    const todayReservations = s.reservations
      .filter((r) => r.startTime <= endOfToday)
      .map((r) => ({
        id: r.id,
        memberId: r.memberId,
        memberName: r.member.fullName,
        projectName: r.project?.name ?? null,
        attendeeNames: r.attendees.map((a) => a.fullName),
        startTime: r.startTime,
        endTime: r.endTime,
        isCurrent: currentReservation?.id === r.id,
      }));

    const upcomingReservations = s.reservations
      .filter((r) => r.startTime > endOfToday)
      .map((r) => ({
        id: r.id,
        memberId: r.memberId,
        memberName: r.member.fullName,
        projectName: r.project?.name ?? null,
        attendeeNames: r.attendees.map((a) => a.fullName),
        startTime: r.startTime,
        endTime: r.endTime,
      }));

    return {
      id: s.id,
      name: s.name,
      type: s.type,
      capacity: s.capacity,
      location: s.location,
      equipment: s.equipment,
      imageUrl: s.imageUrl,
      isActive: s.isActive,
      status,
      activeSession: activeSession
        ? {
            id: activeSession.id,
            memberId: activeSession.member.id,
            memberName: activeSession.member.fullName,
            memberPhoto: activeSession.member.profilePhotoUrl,
            startedAt: activeSession.startedAt,
            projectName: activeSession.project?.name ?? null,
          }
        : null,
      currentReservation: currentReservation
        ? {
            id: currentReservation.id,
            memberId: currentReservation.member.id,
            memberName: currentReservation.member.fullName,
            projectName: currentReservation.project?.name ?? null,
            attendeeNames: currentReservation.attendees.map((a) => a.fullName),
            startTime: currentReservation.startTime,
            endTime: currentReservation.endTime,
          }
        : null,
      nextReservation: nextReservation
        ? { memberName: nextReservation.member.fullName, startTime: nextReservation.startTime, endTime: nextReservation.endTime }
        : null,
      todayReservations,
      upcomingReservations,
    };
  });
}

export type SpaceDashboardItem = Awaited<ReturnType<typeof getSpacesDashboardData>>[number];

const getCachedSpacesBundle = unstable_cache(
  (organizationId: string) => getSpacesDashboardData(organizationId),
  ["spaces-dashboard"],
  { revalidate: 15, tags: ["spaces"] }
);

/**
 * Cached 15s per organization — short deliberately, since AVAILABLE vs.
 * OCCUPIED vs. RESERVED status and current/next-reservation are derived
 * from "now" at fetch time, so a longer window would visibly delay a
 * space flipping status right as a booking starts or ends.
 *
 * unstable_cache round-trips through JSON, so every Date field nested in
 * getSpacesDashboardData's result (activeSession.startedAt, current/next
 * reservation start/end times, today/upcoming reservation lists) comes
 * back as an ISO string on a cache hit. All of them are revived to real
 * Date objects here so space-drawer.tsx, space-overview-card.tsx, etc.
 * keep receiving exactly the shape they already expect.
 */
export async function getCachedSpacesDashboardData(organizationId: string) {
  const spaces = await getCachedSpacesBundle(organizationId);
  return spaces.map((s) => ({
    ...s,
    activeSession: s.activeSession ? { ...s.activeSession, startedAt: new Date(s.activeSession.startedAt) } : null,
    currentReservation: s.currentReservation
      ? {
          ...s.currentReservation,
          startTime: new Date(s.currentReservation.startTime),
          endTime: new Date(s.currentReservation.endTime),
        }
      : null,
    nextReservation: s.nextReservation
      ? {
          ...s.nextReservation,
          startTime: new Date(s.nextReservation.startTime),
          endTime: new Date(s.nextReservation.endTime),
        }
      : null,
    todayReservations: s.todayReservations.map((r) => ({
      ...r,
      startTime: new Date(r.startTime),
      endTime: new Date(r.endTime),
    })),
    upcomingReservations: s.upcomingReservations.map((r) => ({
      ...r,
      startTime: new Date(r.startTime),
      endTime: new Date(r.endTime),
    })),
  }));
}
