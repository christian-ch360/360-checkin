import "server-only";

import { prisma } from "@/lib/db/prisma";

export type SpaceConflict = {
  kind: "reservation" | "event";
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
};

/**
 * Event.spaceId is informational — no FK-level link to Reservation — so
 * "is this space free" has to check both tables directly. Mirrors bookSpace's
 * half-open interval overlap check (start < end && end > start), extended to
 * also catch other PUBLISHED/PENDING_APPROVAL events already claiming the
 * same room. excludeEventId lets an event's own row be re-checked on edit
 * without conflicting with itself.
 */
export async function checkSpaceAvailability(
  spaceId: string,
  startTime: Date,
  endTime: Date,
  excludeEventId?: string
): Promise<SpaceConflict[]> {
  const [reservations, events] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        spaceId,
        status: "CONFIRMED",
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true, startTime: true, endTime: true, notes: true },
    }),
    prisma.event.findMany({
      where: {
        spaceId,
        id: excludeEventId ? { not: excludeEventId } : undefined,
        status: { in: ["PUBLISHED", "PENDING_APPROVAL"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true, title: true, startTime: true, endTime: true },
    }),
  ]);

  const reservationConflicts: SpaceConflict[] = reservations.map((r) => ({
    kind: "reservation",
    id: r.id,
    title: r.notes || "Reserved",
    startTime: r.startTime,
    endTime: r.endTime,
  }));
  const eventConflicts: SpaceConflict[] = events.map((e) => ({
    kind: "event",
    id: e.id,
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
  }));

  return [...reservationConflicts, ...eventConflicts];
}

export type SpaceAvailabilitySummary = {
  spaceId: string;
  name: string;
  capacity: number | null;
  equipment: string[];
  available: boolean;
  conflicts: SpaceConflict[];
};

/** Powers the proposal form's live "is this room free for my time slot" check. */
export async function getSpaceAvailability(
  organizationId: string,
  spaceId: string,
  startTime: Date,
  endTime: Date
): Promise<SpaceAvailabilitySummary | null> {
  const space = await prisma.space.findFirst({
    where: { id: spaceId, organizationId },
    select: { id: true, name: true, capacity: true, equipment: true },
  });
  if (!space) return null;

  const conflicts = await checkSpaceAvailability(spaceId, startTime, endTime);
  return {
    spaceId: space.id,
    name: space.name,
    capacity: space.capacity,
    equipment: space.equipment,
    available: conflicts.length === 0,
    conflicts,
  };
}
