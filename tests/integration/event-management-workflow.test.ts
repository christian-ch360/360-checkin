import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { rsvpMemberToEvent, promoteFromWaitlist } from "@/features/events/services/event-rsvp.service";
import { checkSpaceAvailability } from "@/features/events/services/event-space-availability.service";
import { checkInMemberToEvent } from "@/features/events/services/event-checkin.service";
import { getEventAnalytics } from "@/features/events/services/event-analytics.service";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let spaceId: string;
let hostId: string;
const memberIds: string[] = [];

async function createMember(label: string) {
  const member = await prisma.member.create({
    data: {
      organizationId,
      memberNumber: `TEST-EVT-${label}-${runId}`,
      fullName: `Event Tester ${label}`,
      email: `event-tester-${label}-${runId}@example.com`,
      role: "CREATOR",
      status: "ACTIVE",
    },
  });
  memberIds.push(member.id);
  return member.id;
}

async function createPublishedEvent(overrides: {
  title?: string;
  capacity?: number;
  spaceId?: string;
  startTime?: Date;
  endTime?: Date;
  registrationDeadline?: Date;
} = {}) {
  const { title, capacity, spaceId: overrideSpaceId, startTime, endTime, registrationDeadline } = overrides;
  return prisma.event.create({
    data: {
      organizationId,
      title: title ?? "Test Event",
      startTime: startTime ?? new Date(Date.now() + 60_000),
      endTime: endTime ?? new Date(Date.now() + 2 * 3600_000),
      createdById: hostId,
      status: "PUBLISHED",
      capacity,
      spaceId: overrideSpaceId,
      registrationDeadline,
    },
  });
}

describe("Event Management workflow (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Events ${runId}`, slug: `test-org-events-${runId}` },
    });
    organizationId = org.id;

    hostId = await createMember("HOST");

    const space = await prisma.space.create({
      data: { organizationId, name: `Test Room ${runId}`, type: "MEETING_ROOM", capacity: 10, isActive: true },
    });
    spaceId = space.id;
  });

  afterAll(async () => {
    await prisma.eventCheckIn.deleteMany({ where: { event: { organizationId } } });
    await prisma.eventRsvp.deleteMany({ where: { event: { organizationId } } });
    await prisma.notification.deleteMany({ where: { member: { organizationId } } });
    await prisma.event.deleteMany({ where: { organizationId } });
    await prisma.reservation.deleteMany({ where: { organizationId } });
    await prisma.space.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("lets a member RSVP GOING to a published event", async () => {
    const event = await createPublishedEvent({ title: "RSVP Basics" });
    const memberId = await createMember("RSVP1");

    const result = await rsvpMemberToEvent(event.id, memberId, "GOING");
    expect(result.outcome).toBe("ok");
    if (result.outcome !== "ok") return;
    expect(result.status).toBe("GOING");

    const rsvp = await prisma.eventRsvp.findUnique({ where: { eventId_memberId: { eventId: event.id, memberId } } });
    expect(rsvp?.status).toBe("GOING");
  });

  it("auto-waitlists once capacity is reached, and promotes the earliest waitlisted member when a spot opens", async () => {
    const event = await createPublishedEvent({ title: "Capacity Test", capacity: 2 });
    const [m1, m2, m3] = [await createMember("CAP1"), await createMember("CAP2"), await createMember("CAP3")];

    const r1 = await rsvpMemberToEvent(event.id, m1, "GOING");
    const r2 = await rsvpMemberToEvent(event.id, m2, "GOING");
    expect(r1).toMatchObject({ outcome: "ok", status: "GOING" });
    expect(r2).toMatchObject({ outcome: "ok", status: "GOING" });

    // Capacity is full — the third GOING request should be silently redirected to the waitlist.
    const r3 = await rsvpMemberToEvent(event.id, m3, "GOING");
    expect(r3).toMatchObject({ outcome: "ok", status: "WAITLISTED" });

    const waitlisted = await prisma.eventRsvp.findUnique({ where: { eventId_memberId: { eventId: event.id, memberId: m3 } } });
    expect(waitlisted?.status).toBe("WAITLISTED");
    expect(waitlisted?.waitlistPosition).toBe(1);

    // m1 cancels — rsvpMemberToEvent promotes the earliest waitlisted member
    // internally when a GOING spot opens up.
    await rsvpMemberToEvent(event.id, m1, "NOT_GOING");

    const promoted = await prisma.eventRsvp.findUnique({ where: { eventId_memberId: { eventId: event.id, memberId: m3 } } });
    expect(promoted?.status).toBe("GOING");
    expect(promoted?.waitlistPosition).toBeNull();
  });

  it("promoteFromWaitlist always promotes the earliest waitlist position first", async () => {
    const event = await createPublishedEvent({ title: "Waitlist Order Test", capacity: 1 });
    const [going, first, second] = [
      await createMember("ORD-GOING"),
      await createMember("ORD-FIRST"),
      await createMember("ORD-SECOND"),
    ];

    await rsvpMemberToEvent(event.id, going, "GOING");
    await rsvpMemberToEvent(event.id, first, "GOING"); // capacity full -> waitlist position 1
    await rsvpMemberToEvent(event.id, second, "GOING"); // waitlist position 2

    // Directly exercise promoteFromWaitlist (rather than via a cancelling RSVP) to prove the ordering guarantee in isolation.
    await prisma.eventRsvp.update({ where: { eventId_memberId: { eventId: event.id, memberId: going } }, data: { status: "NOT_GOING" } });
    const promotion = await promoteFromWaitlist(event.id);
    expect(promotion?.memberId).toBe(first);

    const firstRow = await prisma.eventRsvp.findUnique({ where: { eventId_memberId: { eventId: event.id, memberId: first } } });
    const secondRow = await prisma.eventRsvp.findUnique({ where: { eventId_memberId: { eventId: event.id, memberId: second } } });
    expect(firstRow?.status).toBe("GOING");
    expect(secondRow?.status).toBe("WAITLISTED");
  });

  it("blocks GOING RSVPs once the registration deadline has passed", async () => {
    const event = await createPublishedEvent({ title: "Deadline Test", registrationDeadline: new Date(Date.now() - 1000) });
    const memberId = await createMember("DEADLINE");

    const result = await rsvpMemberToEvent(event.id, memberId, "GOING");
    expect(result.outcome).toBe("closed");
  });

  it("detects a space conflict against an existing confirmed reservation", async () => {
    const start = new Date(Date.now() + 3600_000);
    const end = new Date(Date.now() + 2 * 3600_000);
    const reservingMember = await createMember("RESV");

    await prisma.reservation.create({
      data: { organizationId, spaceId, memberId: reservingMember, startTime: start, endTime: end, status: "CONFIRMED" },
    });

    const conflicts = await checkSpaceAvailability(spaceId, start, end);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].kind).toBe("reservation");
  });

  it("detects a space conflict against another published event", async () => {
    const start = new Date(Date.now() + 10 * 3600_000);
    const end = new Date(Date.now() + 11 * 3600_000);
    await createPublishedEvent({ title: "First Booking", spaceId, startTime: start, endTime: end });

    const conflicts = await checkSpaceAvailability(spaceId, start, end);
    const eventConflict = conflicts.find((c) => c.kind === "event");
    expect(eventConflict?.title).toBe("First Booking");
  });

  it("reports no conflict for a genuinely free window", async () => {
    const farFuture = new Date(Date.now() + 30 * 24 * 3600_000);
    const conflicts = await checkSpaceAvailability(spaceId, farFuture, new Date(farFuture.getTime() + 3600_000));
    expect(conflicts).toHaveLength(0);
  });

  it("records a check-in and is idempotent on a second scan", async () => {
    const event = await createPublishedEvent({ title: "Checkin Test" });
    const memberId = await createMember("CHECKIN");

    const first = await checkInMemberToEvent(event.id, memberId, "QR");
    expect(first.outcome).toBe("checked_in");

    const second = await checkInMemberToEvent(event.id, memberId, "QR");
    expect(second.outcome).toBe("already_checked_in");

    const count = await prisma.eventCheckIn.count({ where: { eventId: event.id } });
    expect(count).toBe(1);
  });

  it("computes event analytics (rsvp counts, check-ins, capacity utilization)", async () => {
    const event = await createPublishedEvent({ title: "Analytics Test", capacity: 4 });
    const [a, b] = [await createMember("AN1"), await createMember("AN2")];
    await rsvpMemberToEvent(event.id, a, "GOING");
    await rsvpMemberToEvent(event.id, b, "MAYBE");
    await checkInMemberToEvent(event.id, a, "QR");

    const analytics = await getEventAnalytics(organizationId, event.id);
    expect(analytics?.rsvps.GOING).toBe(1);
    expect(analytics?.rsvps.MAYBE).toBe(1);
    expect(analytics?.checkedIn).toBe(1);
    expect(analytics?.capacityUtilization).toBe(25);
  });
});
