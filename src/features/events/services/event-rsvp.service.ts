import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { RsvpStatus } from "@prisma/client";
import { consumeUsage } from "@/features/membership-plans/services/membership-usage.service";

export type RsvpMemberResult =
  | { outcome: "ok"; status: RsvpStatus; wasGoingBefore: boolean }
  | { outcome: "not_found" }
  | { outcome: "closed" };

/**
 * Pure RSVP core — no auth, no email/notification side effects, so it's
 * directly testable and reusable from any actor context. Callers (the
 * "use server" action layer) resolve the actor, call this, then handle
 * confirmation emails / waitlist-promotion notifications off the result.
 */
export async function rsvpMemberToEvent(
  eventId: string,
  memberId: string,
  status: Extract<RsvpStatus, "GOING" | "MAYBE" | "NOT_GOING">
): Promise<RsvpMemberResult> {
  const event = await prisma.event.findFirst({ where: { id: eventId, status: "PUBLISHED" } });
  if (!event) return { outcome: "not_found" };

  const existing = await prisma.eventRsvp.findUnique({
    where: { eventId_memberId: { eventId, memberId } },
    select: { status: true },
  });
  const wasGoingBefore = existing?.status === "GOING";

  if (status === "GOING" && !wasGoingBefore) {
    if (event.registrationDeadline && event.registrationDeadline < new Date()) {
      return { outcome: "closed" };
    }
    if (event.capacity) {
      const goingCount = await prisma.eventRsvp.count({ where: { eventId, status: "GOING" } });
      if (goingCount >= event.capacity) {
        return joinEventWaitlist(eventId, memberId);
      }
    }
  }

  await prisma.eventRsvp.upsert({
    where: { eventId_memberId: { eventId, memberId } },
    update: { status, waitlistPosition: null },
    create: { eventId, memberId, status },
  });

  if (status !== "GOING" && wasGoingBefore) {
    await promoteFromWaitlist(eventId);
  }

  // Tracking-only decrement of the member's "Monthly Networking Event
  // Credits" benefit — informational display, never blocks the RSVP itself
  // even if the member's package has none/zero remaining.
  if (status === "GOING" && !wasGoingBefore && event.category === "COMMUNITY_MIXER") {
    await consumeUsage(memberId, "networking_event_credits", 1);
  }

  return { outcome: "ok", status, wasGoingBefore };
}

export async function joinEventWaitlist(eventId: string, memberId: string): Promise<RsvpMemberResult> {
  const event = await prisma.event.findFirst({ where: { id: eventId, status: "PUBLISHED" } });
  if (!event) return { outcome: "not_found" };

  const lastPosition = await prisma.eventRsvp.aggregate({
    where: { eventId, status: "WAITLISTED" },
    _max: { waitlistPosition: true },
  });
  const nextPosition = (lastPosition._max.waitlistPosition ?? 0) + 1;

  await prisma.eventRsvp.upsert({
    where: { eventId_memberId: { eventId, memberId } },
    update: { status: "WAITLISTED", waitlistPosition: nextPosition },
    create: { eventId, memberId, status: "WAITLISTED", waitlistPosition: nextPosition },
  });

  return { outcome: "ok", status: "WAITLISTED", wasGoingBefore: false };
}

export type WaitlistPromotion = { memberId: string; eventTitle: string; startTime: Date; location: string | null } | null;

/** Promotes the earliest waitlisted member to GOING when a spot opens up — fires after any GOING RSVP cancels. */
export async function promoteFromWaitlist(eventId: string): Promise<WaitlistPromotion> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event?.capacity) return null;

  const goingCount = await prisma.eventRsvp.count({ where: { eventId, status: "GOING" } });
  if (goingCount >= event.capacity) return null;

  const next = await prisma.eventRsvp.findFirst({
    where: { eventId, status: "WAITLISTED" },
    orderBy: { waitlistPosition: "asc" },
  });
  if (!next) return null;

  await prisma.eventRsvp.update({ where: { id: next.id }, data: { status: "GOING", waitlistPosition: null } });
  return { memberId: next.memberId, eventTitle: event.title, startTime: event.startTime, location: event.location };
}
