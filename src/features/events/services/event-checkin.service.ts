import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { EventCheckInMethod } from "@prisma/client";

export type EventCheckInResult =
  | { outcome: "checked_in"; eventTitle: string }
  | { outcome: "already_checked_in"; eventTitle: string }
  | { outcome: "not_found" };

/**
 * Records attendance for a published event — walk-ins are allowed (no RSVP
 * required), matching how facility check-in already works. The unique
 * [eventId, memberId] constraint on EventCheckIn makes this naturally
 * idempotent, so a second scan of the same person is a friendly no-op
 * rather than an error.
 */
export async function checkInMemberToEvent(
  eventId: string,
  memberId: string,
  method: EventCheckInMethod,
  checkedInById?: string
): Promise<EventCheckInResult> {
  const event = await prisma.event.findFirst({ where: { id: eventId, status: "PUBLISHED" }, select: { title: true } });
  if (!event) return { outcome: "not_found" };

  const existing = await prisma.eventCheckIn.findUnique({ where: { eventId_memberId: { eventId, memberId } } });
  if (existing) return { outcome: "already_checked_in", eventTitle: event.title };

  await prisma.eventCheckIn.create({
    data: { eventId, memberId, method, checkedInById: checkedInById ?? null },
  });

  return { outcome: "checked_in", eventTitle: event.title };
}
