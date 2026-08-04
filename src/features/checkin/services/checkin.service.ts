import "server-only";

import { startOfDay, differenceInMinutes } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/db/activity-log";
import { logAudit } from "@/lib/db/audit-log";

export type CheckInResult =
  | { action: "checked_in"; checkInId: string }
  | { action: "checked_out"; checkInId: string; durationMinutes: number }
  | { error: string };

export async function getOpenCheckIn(memberId: string) {
  return prisma.checkIn.findFirst({
    where: { memberId, status: "CHECKED_IN" },
    orderBy: { checkIn: "desc" },
  });
}

/**
 * Opens a new check-in for a member. Shared by toggleCheckIn (dashboard/badge-reader
 * and kiosk flows) — a second scan/tap always closes it out via toggleCheckIn,
 * this only ever creates the opening half of a visit.
 */
export async function createCheckIn(
  member: { id: string; organizationId: string },
  source: "qr" | "manual" | "usb_scanner" = "qr"
) {
  const checkIn = await prisma.checkIn.create({
    data: { memberId: member.id, source },
  });

  await logActivity({
    organizationId: member.organizationId,
    memberId: member.id,
    action: "member.checked_in",
    entityType: "check_in",
    entityId: checkIn.id,
  });
  await logAudit({
    organizationId: member.organizationId,
    actorId: member.id,
    action: "member.checked_in",
    entityType: "check_in",
    entityId: checkIn.id,
  });

  return checkIn;
}

/**
 * Toggles check-in state for a member: if they have an open check-in,
 * this closes it out (checkout); otherwise it opens a new one (checkin).
 * Never creates a duplicate open session — getOpenCheckIn is the single
 * source of truth for "are they currently in," gated on status rather than
 * checkOut nullability, but the two are always written together so either
 * check is equivalent.
 */
export async function toggleCheckIn(memberId: string, source: "qr" | "manual" | "usb_scanner" = "qr"): Promise<CheckInResult> {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return { error: "Member not found" };
  if (member.status === "SUSPENDED") return { error: "This member is suspended and cannot check in." };
  if (member.status === "PENDING") return { error: "This member's application is still under review and cannot check in yet." };
  if (member.status === "REJECTED") return { error: "This member's application was not approved and cannot check in." };

  const open = await getOpenCheckIn(memberId);

  if (open) {
    const checkOut = new Date();
    const durationMinutes = Math.max(0, differenceInMinutes(checkOut, open.checkIn));

    const [checkIn] = await prisma.$transaction([
      prisma.checkIn.update({
        where: { id: open.id },
        data: { checkOut, duration: durationMinutes, status: "CHECKED_OUT" },
      }),
      prisma.member.update({
        where: { id: memberId },
        data: { hoursWorked: { increment: durationMinutes / 60 } },
      }),
    ]);

    await logActivity({
      organizationId: member.organizationId,
      memberId,
      action: "member.checked_out",
      entityType: "check_in",
      entityId: checkIn.id,
      metadata: { durationMinutes },
    });
    await logAudit({
      organizationId: member.organizationId,
      actorId: memberId,
      action: "member.checked_out",
      entityType: "check_in",
      entityId: checkIn.id,
      after: { durationMinutes },
    });

    return { action: "checked_out", checkInId: checkIn.id, durationMinutes };
  }

  const checkIn = await createCheckIn(member, source);
  return { action: "checked_in", checkInId: checkIn.id };
}

export async function getFacilityOverview(organizationId: string) {
  const todayStart = startOfDay(new Date());

  const [currentlyIn, todayCheckIns, todayCheckOuts] = await Promise.all([
    prisma.checkIn.findMany({
      where: { status: "CHECKED_IN", member: { organizationId } },
      include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true, memberNumber: true, role: true } } },
      orderBy: { checkIn: "desc" },
    }),
    prisma.checkIn.count({
      where: { checkIn: { gte: todayStart }, member: { organizationId } },
    }),
    prisma.checkIn.count({
      where: { checkOut: { gte: todayStart }, member: { organizationId } },
    }),
  ]);

  const avgDurationAgg = await prisma.checkIn.aggregate({
    where: { member: { organizationId }, duration: { not: null } },
    _avg: { duration: true },
  });

  return {
    currentlyIn,
    todayCheckIns,
    todayCheckOuts,
    averageMinutes: Number(avgDurationAgg._avg.duration ?? 0),
  };
}

export async function getAttendanceHistory(organizationId: string, take = 100) {
  return prisma.checkIn.findMany({
    where: { member: { organizationId } },
    orderBy: { checkIn: "desc" },
    take,
    include: { member: { select: { id: true, fullName: true, memberNumber: true, profilePhotoUrl: true } } },
  });
}

/** Member profile's Attendance section (spec: today's visit, total visits, average/longest visit, last visit, current status). */
export async function getMemberAttendanceStats(memberId: string) {
  const [visits, openSession] = await Promise.all([
    prisma.checkIn.findMany({
      where: { memberId },
      orderBy: { checkIn: "desc" },
    }),
    prisma.checkIn.findFirst({ where: { memberId, status: "CHECKED_IN" } }),
  ]);

  const todayStart = startOfDay(new Date());
  const todayVisit = visits.find((v) => v.checkIn >= todayStart) ?? null;
  const completed = visits.filter((v) => v.duration != null);
  const totalDuration = completed.reduce((sum, v) => sum + (v.duration ?? 0), 0);
  const averageMinutes = completed.length > 0 ? totalDuration / completed.length : 0;
  const longestMinutes = completed.reduce((max, v) => Math.max(max, v.duration ?? 0), 0);
  const lastVisit = visits[0] ?? null;

  return {
    totalVisits: visits.length,
    todayVisit,
    averageMinutes,
    longestMinutes,
    lastVisit,
    isCurrentlyCheckedIn: Boolean(openSession),
    openSession,
  };
}
