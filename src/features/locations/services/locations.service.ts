import "server-only";

import { differenceInMinutes } from "date-fns";
import type { ScanEventAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function getLocationBySlug(organizationId: string, slug: string) {
  return prisma.location.findFirst({ where: { organizationId, slug, active: true } });
}

export async function listLocations(organizationId: string) {
  return prisma.location.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
}

export type LocationOccupant = {
  memberId: string;
  memberName: string;
  profilePhotoUrl: string | null;
  since: Date;
};

export type LocationOccupancy = {
  id: string;
  name: string;
  slug: string;
  type: string;
  capacity: number | null;
  status: "OCCUPIED" | "AVAILABLE";
  occupants: LocationOccupant[];
};

/**
 * Occupancy is never stored — it's derived from each member's latest
 * ScanEvent at a location, the same pattern getSpacesDashboardData already
 * uses for Space AVAILABLE/OCCUPIED status. Prisma's `distinct` compiles to
 * `DISTINCT ON`, so this is a single query rather than N look-ups.
 */
export async function getLocationOccupancy(organizationId: string): Promise<LocationOccupancy[]> {
  const locations = await prisma.location.findMany({ where: { organizationId, active: true }, orderBy: { name: "asc" } });
  const locationIds = locations.map((l) => l.id);
  if (locationIds.length === 0) return [];

  const latestPerMemberLocation = await prisma.scanEvent.findMany({
    where: { locationId: { in: locationIds }, memberId: { not: null } },
    orderBy: [{ locationId: "asc" }, { memberId: "asc" }, { timestamp: "desc" }],
    distinct: ["locationId", "memberId"],
    include: { member: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
  });

  const occupantsByLocation = new Map<string, LocationOccupant[]>();
  for (const event of latestPerMemberLocation) {
    if (!event.locationId || !event.member) continue;
    if (event.action !== "SPACE_ENTER" && event.action !== "FACILITY_CHECK_IN") continue;
    const list = occupantsByLocation.get(event.locationId) ?? [];
    list.push({
      memberId: event.member.id,
      memberName: event.member.fullName,
      profilePhotoUrl: event.member.profilePhotoUrl,
      since: event.timestamp,
    });
    occupantsByLocation.set(event.locationId, list);
  }

  return locations.map((location) => {
    const occupants = occupantsByLocation.get(location.id) ?? [];
    return {
      id: location.id,
      name: location.name,
      slug: location.slug,
      type: location.type,
      capacity: location.capacity,
      status: occupants.length > 0 ? "OCCUPIED" : "AVAILABLE",
      occupants,
    };
  });
}

/**
 * Whether a given member currently holds an open SPACE_ENTER at this
 * location (no matching SPACE_EXIT yet) — the single-scan toggle at
 * non-entrance kiosks reads this to decide enter vs. exit.
 */
export async function getOpenLocationScan(memberId: string, locationId: string) {
  const latest = await prisma.scanEvent.findFirst({
    where: { memberId, locationId, action: { in: ["SPACE_ENTER", "SPACE_EXIT"] } },
    orderBy: { timestamp: "desc" },
  });
  return latest?.action === "SPACE_ENTER" ? latest : null;
}

/**
 * Single write path for the audit log — never updates or overwrites a row,
 * matching createCheckIn's append-only style in checkin.service.ts.
 */
export async function logScanEvent(input: {
  memberId?: string | null;
  visitorId?: string | null;
  location: { id: string; name: string; type: string };
  deviceId?: string | null;
  action: ScanEventAction;
  notes?: string | null;
}) {
  return prisma.scanEvent.create({
    data: {
      memberId: input.memberId ?? null,
      visitorId: input.visitorId ?? null,
      locationId: input.location.id,
      locationName: input.location.name,
      locationType: input.location.type,
      deviceId: input.deviceId ?? null,
      action: input.action,
      notes: input.notes ?? null,
    },
  });
}

export type MemberSpaceTimeStats = {
  todayMinutes: number;
  weeklyMinutes: number;
  monthlyMinutes: number;
  averageSessionMinutes: number;
  byLocationType: Record<string, number>;
};

/**
 * Pairs each member's SPACE_ENTER -> SPACE_EXIT ScanEvent rows chronologically
 * per location to compute time-in-booths/podcast-room/recording-studio/etc.
 * Mirrors createCheckIn/toggleCheckIn's duration math (differenceInMinutes),
 * just applied to the append-only ScanEvent log instead of a status field.
 */
export async function getMemberSpaceTimeStats(memberId: string): Promise<MemberSpaceTimeStats> {
  const events = await prisma.scanEvent.findMany({
    where: { memberId, action: { in: ["SPACE_ENTER", "SPACE_EXIT"] } },
    orderBy: { timestamp: "asc" },
  });

  const openByLocation = new Map<string, Date>();
  const sessions: { locationType: string; minutes: number; endedAt: Date }[] = [];

  for (const event of events) {
    const key = event.locationId ?? event.locationName;
    if (event.action === "SPACE_ENTER") {
      openByLocation.set(key, event.timestamp);
    } else if (event.action === "SPACE_EXIT") {
      const start = openByLocation.get(key);
      if (start) {
        sessions.push({
          locationType: event.locationType,
          minutes: Math.max(0, differenceInMinutes(event.timestamp, start)),
          endedAt: event.timestamp,
        });
        openByLocation.delete(key);
      }
    }
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sum = (list: typeof sessions) => list.reduce((total, s) => total + s.minutes, 0);

  const todayMinutes = sum(sessions.filter((s) => s.endedAt >= todayStart));
  const weeklyMinutes = sum(sessions.filter((s) => s.endedAt >= weekAgo));
  const monthlyMinutes = sum(sessions.filter((s) => s.endedAt >= monthAgo));
  const averageSessionMinutes = sessions.length > 0 ? sum(sessions) / sessions.length : 0;

  const byLocationType: Record<string, number> = {};
  for (const s of sessions) {
    byLocationType[s.locationType] = (byLocationType[s.locationType] ?? 0) + s.minutes;
  }

  return { todayMinutes, weeklyMinutes, monthlyMinutes, averageSessionMinutes, byLocationType };
}
