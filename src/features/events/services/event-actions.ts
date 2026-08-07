"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/db/activity-log";
import { logAudit } from "@/lib/db/audit-log";
import { notifyMembers } from "@/lib/notifications";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import {
  eventProposalSchema,
  eventDraftSchema,
  rsvpSchema,
  rejectEventSchema,
  requestEventChangesSchema,
  cancelEventSchema,
  type EventDraftInput,
} from "@/features/events/schemas/event.schema";
import { checkSpaceAvailability } from "@/features/events/services/event-space-availability.service";
import { rsvpMemberToEvent, promoteFromWaitlist } from "@/features/events/services/event-rsvp.service";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { EmailService } from "@/lib/email/email-service";

export type EventActionResult =
  | { success: true; eventId?: string; status?: "GOING" | "MAYBE" | "NOT_GOING" | "WAITLISTED" }
  | { success: false; error: string };

function appUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${path}`;
}

async function requireEventManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "events.manage")) {
    throw new Error("You don't have permission to manage events.");
  }
  return actor;
}

async function notifyEventManagers(organizationId: string, notif: Parameters<typeof notifyMembers>[1]) {
  const managers = await prisma.member.findMany({
    where: { organizationId, status: "ACTIVE", systemRole: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true },
  });
  if (managers.length) await notifyMembers(managers.map((m) => m.id), notif);
}

function draftToWriteData(data: EventDraftInput) {
  return {
    title: data.title,
    description: data.description || null,
    category: data.category,
    location: data.location || null,
    spaceId: data.spaceId || null,
    startTime: data.startTime,
    endTime: data.endTime,
    capacity: data.capacity ?? null,
    imageUrl: data.imageUrl || null,
    logoUrl: data.logoUrl || null,
    hostName: data.hostName || null,
    hostContact: data.hostContact || null,
    registrationDeadline: data.registrationDeadline ?? null,
    website: data.website || null,
    dressCode: data.dressCode || null,
    foodProvided: data.foodProvided ?? false,
    parkingInfo: data.parkingInfo || null,
    equipmentNeeded: data.equipmentNeeded ?? [],
    livestreamUrl: data.livestreamUrl || null,
    ticketPriceCents: data.ticketPriceCents ?? null,
    isPrivate: data.isPrivate ?? false,
    sponsors: (data.sponsors as Prisma.InputJsonValue | undefined) ?? undefined,
  };
}

/** Creates a new proposal or edits an existing one in place — allowed while DRAFT (including "changes requested," which is stored as DRAFT + changeRequestNote). Anyone can save a draft; only the owner or an events.manage holder can edit an existing one. */
export async function saveEventDraft(input: EventDraftInput, eventId?: string): Promise<EventActionResult> {
  const actor = await requireCurrentMember();
  const parsed = eventDraftSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (eventId) {
    const existing = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
    if (!existing) return { success: false, error: "Event not found." };
    const isManager = hasPermission(actor.systemRole, "events.manage");
    if (existing.createdById !== actor.id && !isManager) return { success: false, error: "Not authorized." };
    if (existing.status !== "DRAFT" && !isManager) return { success: false, error: "This proposal can no longer be edited." };

    await prisma.event.update({ where: { id: eventId }, data: draftToWriteData(parsed.data) });
    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);
    return { success: true, eventId };
  }

  const event = await prisma.event.create({
    data: { organizationId: actor.organizationId, createdById: actor.id, status: "DRAFT", ...draftToWriteData(parsed.data) },
  });
  revalidatePath("/events");
  return { success: true, eventId: event.id };
}

/** DRAFT -> PENDING_APPROVAL. Runs full validation (unlike saveEventDraft) since this is the point a proposal becomes admin-visible. */
export async function submitEventForApproval(eventId: string): Promise<EventActionResult> {
  const actor = await requireCurrentMember();
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { success: false, error: "Event not found." };
  if (event.createdById !== actor.id && !hasPermission(actor.systemRole, "events.manage")) {
    return { success: false, error: "Not authorized." };
  }
  if (event.status !== "DRAFT") return { success: false, error: "Only drafts can be submitted for approval." };

  const parsed = eventProposalSchema.safeParse({
    title: event.title,
    description: event.description ?? undefined,
    category: event.category,
    location: event.location ?? undefined,
    spaceId: event.spaceId ?? undefined,
    startTime: event.startTime,
    endTime: event.endTime,
    capacity: event.capacity ?? undefined,
    imageUrl: event.imageUrl ?? undefined,
    logoUrl: event.logoUrl ?? undefined,
    hostName: event.hostName ?? undefined,
    hostContact: event.hostContact ?? undefined,
    registrationDeadline: event.registrationDeadline ?? undefined,
    website: event.website ?? undefined,
    dressCode: event.dressCode ?? undefined,
    foodProvided: event.foodProvided,
    parkingInfo: event.parkingInfo ?? undefined,
    equipmentNeeded: event.equipmentNeeded,
    livestreamUrl: event.livestreamUrl ?? undefined,
    ticketPriceCents: event.ticketPriceCents ?? undefined,
    isPrivate: event.isPrivate,
  });
  if (!parsed.success) {
    return { success: false, error: `Fill in ${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "PENDING_APPROVAL", submittedAt: new Date(), changeRequestNote: null, rejectionReason: null },
  });

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "event.submitted",
    entityType: "event",
    entityId: eventId,
    metadata: { title: event.title },
  });
  await notifyEventManagers(actor.organizationId, {
    type: "EVENT_PROPOSAL_SUBMITTED",
    title: `New event proposal: ${event.title}`,
    link: `/admin/events?tab=pending`,
  });

  revalidatePath("/events");
  revalidatePath("/admin/events");
  return { success: true, eventId };
}

export async function approveEvent(eventId: string): Promise<EventActionResult> {
  const actor = await requireEventManager();
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { success: false, error: "Event not found." };
  if (event.status !== "PENDING_APPROVAL") return { success: false, error: "Only pending proposals can be approved." };

  if (event.spaceId) {
    const conflicts = await checkSpaceAvailability(event.spaceId, event.startTime, event.endTime, event.id);
    if (conflicts.length > 0) {
      return { success: false, error: "The selected space has a conflicting booking for this time. Change the space or time before approving." };
    }
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "PUBLISHED", approvedById: actor.id, approvedAt: new Date() },
  });
  // "Unique per published event, no duplicate entry required" — minted once here, reused on every re-approval of a resubmitted proposal (ensureQRAsset is idempotent).
  await ensureQRAsset({ type: "EVENT", eventId });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "event.approved",
    entityType: "event",
    entityId: eventId,
    after: { title: event.title },
  });

  const submitter = await prisma.member.findUnique({ where: { id: event.createdById }, select: { id: true, email: true, fullName: true, notifyEmail: true } });
  if (submitter) {
    await notifyMembers([submitter.id], { type: "EVENT_APPROVED", title: `${event.title} was approved`, link: `/events/${eventId}` });
    if (submitter.notifyEmail) {
      await EmailService.sendEventApprovedEmail({
        to: submitter.email,
        fullName: submitter.fullName,
        eventTitle: event.title,
        startTime: event.startTime,
        eventUrl: appUrl(`/events/${eventId}`),
        organizationId: actor.organizationId,
        memberId: submitter.id,
      });
    }
  }

  const members = await prisma.member.findMany({
    where: { organizationId: actor.organizationId, status: "ACTIVE", id: { not: event.createdById } },
    select: { id: true },
  });
  await notifyMembers(members.map((m) => m.id), { type: "SYSTEM", title: `New event: ${event.title}`, link: `/events/${event.id}` });

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/events");
  revalidatePath("/kiosk");
  return { success: true, eventId };
}

export async function rejectEvent(eventId: string, reason: string): Promise<EventActionResult> {
  const actor = await requireEventManager();
  const parsed = rejectEventSchema.safeParse({ reason });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { success: false, error: "Event not found." };
  if (event.status !== "PENDING_APPROVAL") return { success: false, error: "Only pending proposals can be rejected." };

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "REJECTED", rejectedById: actor.id, rejectedAt: new Date(), rejectionReason: parsed.data.reason },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "event.rejected",
    entityType: "event",
    entityId: eventId,
    after: { reason: parsed.data.reason },
  });

  const submitter = await prisma.member.findUnique({ where: { id: event.createdById }, select: { id: true, email: true, fullName: true, notifyEmail: true } });
  if (submitter) {
    await notifyMembers([submitter.id], { type: "EVENT_REJECTED", title: `${event.title} was declined`, link: `/events/proposals/${eventId}` });
    if (submitter.notifyEmail) {
      await EmailService.sendEventRejectedEmail({
        to: submitter.email,
        fullName: submitter.fullName,
        eventTitle: event.title,
        reason: parsed.data.reason,
        organizationId: actor.organizationId,
        memberId: submitter.id,
      });
    }
  }

  revalidatePath("/events");
  revalidatePath("/admin/events");
  return { success: true, eventId };
}

export async function requestEventChanges(eventId: string, note: string): Promise<EventActionResult> {
  const actor = await requireEventManager();
  const parsed = requestEventChangesSchema.safeParse({ note });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { success: false, error: "Event not found." };
  if (event.status !== "PENDING_APPROVAL") return { success: false, error: "Only pending proposals can have changes requested." };

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "DRAFT", changeRequestNote: parsed.data.note, submittedAt: null },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "event.changes_requested",
    entityType: "event",
    entityId: eventId,
    after: { note: parsed.data.note },
  });

  const submitter = await prisma.member.findUnique({ where: { id: event.createdById }, select: { id: true, email: true, fullName: true, notifyEmail: true } });
  if (submitter) {
    await notifyMembers([submitter.id], { type: "EVENT_CHANGES_REQUESTED", title: `Changes requested for ${event.title}`, link: `/events/proposals/${eventId}` });
    if (submitter.notifyEmail) {
      await EmailService.sendEventChangesRequestedEmail({
        to: submitter.email,
        fullName: submitter.fullName,
        eventTitle: event.title,
        note: parsed.data.note,
        editUrl: appUrl(`/events/proposals/${eventId}`),
        organizationId: actor.organizationId,
        memberId: submitter.id,
      });
    }
  }

  revalidatePath("/events");
  revalidatePath("/admin/events");
  return { success: true, eventId };
}

export async function cancelEvent(eventId: string, reason?: string): Promise<EventActionResult> {
  const actor = await requireEventManager();
  const parsed = cancelEventSchema.safeParse({ reason });
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { success: false, error: "Event not found." };
  if (event.status !== "PUBLISHED") return { success: false, error: "Only published events can be cancelled." };

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: "CANCELLED",
      cancelledById: actor.id,
      cancelledAt: new Date(),
      cancellationReason: parsed.data.reason || null,
      isFeatured: false,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "event.cancelled",
    entityType: "event",
    entityId: eventId,
    after: { reason: parsed.data.reason ?? null },
  });

  const goingRsvps = await prisma.eventRsvp.findMany({
    where: { eventId, status: { in: ["GOING", "WAITLISTED"] } },
    include: { member: { select: { id: true, email: true, fullName: true, notifyEmail: true } } },
  });
  if (goingRsvps.length) {
    await notifyMembers(
      goingRsvps.map((r) => r.memberId),
      { type: "EVENT_CANCELLED", title: `${event.title} was cancelled`, link: `/events/${eventId}` }
    );
    await Promise.all(
      goingRsvps
        .filter((r) => r.member.notifyEmail)
        .map((r) =>
          EmailService.sendEventCancelledEmail({
            to: r.member.email,
            fullName: r.member.fullName,
            eventTitle: event.title,
            startTime: event.startTime,
            reason: parsed.data.reason || null,
            organizationId: actor.organizationId,
            memberId: r.member.id,
          })
        )
    );
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/events");
  revalidatePath("/kiosk");
  return { success: true, eventId };
}

export async function archiveEvent(eventId: string): Promise<EventActionResult> {
  const actor = await requireEventManager();
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { success: false, error: "Event not found." };

  await prisma.event.update({ where: { id: eventId }, data: { archivedAt: new Date(), isFeatured: false } });
  await logAudit({ organizationId: actor.organizationId, actorId: actor.id, action: "event.archived", entityType: "event", entityId: eventId });

  revalidatePath("/admin/events");
  return { success: true, eventId };
}

export async function duplicateEvent(eventId: string): Promise<EventActionResult> {
  const actor = await requireEventManager();
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { success: false, error: "Event not found." };

  const copy = await prisma.event.create({
    data: {
      organizationId: actor.organizationId,
      createdById: actor.id,
      status: "DRAFT",
      title: `${event.title} (Copy)`,
      description: event.description,
      category: event.category,
      location: event.location,
      spaceId: event.spaceId,
      startTime: event.startTime,
      endTime: event.endTime,
      capacity: event.capacity,
      imageUrl: event.imageUrl,
      logoUrl: event.logoUrl,
      hostName: event.hostName,
      hostContact: event.hostContact,
      registrationDeadline: event.registrationDeadline,
      website: event.website,
      dressCode: event.dressCode,
      foodProvided: event.foodProvided,
      parkingInfo: event.parkingInfo,
      equipmentNeeded: event.equipmentNeeded,
      livestreamUrl: event.livestreamUrl,
      ticketPriceCents: event.ticketPriceCents,
      isPrivate: event.isPrivate,
      sponsors: event.sponsors ?? undefined,
    },
  });

  revalidatePath("/admin/events");
  return { success: true, eventId: copy.id };
}

/** "Only one featured event at a time" — transactional unset-then-set, same pattern as KioskTheme.isPinnedLive. */
export async function featureEvent(eventId: string, featured: boolean): Promise<EventActionResult> {
  const actor = await requireEventManager();
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!event) return { success: false, error: "Event not found." };
  if (featured && event.status !== "PUBLISHED") return { success: false, error: "Only published events can be featured." };

  await prisma.$transaction([
    prisma.event.updateMany({ where: { organizationId: actor.organizationId, isFeatured: true }, data: { isFeatured: false } }),
    ...(featured ? [prisma.event.update({ where: { id: eventId }, data: { isFeatured: true } })] : []),
  ]);

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: featured ? "event.featured" : "event.unfeatured",
    entityType: "event",
    entityId: eventId,
  });

  revalidatePath("/admin/events");
  revalidatePath("/kiosk");
  return { success: true, eventId };
}

/** Admin direct edit — available on any status (e.g. "edit before publishing" per the approval-rules spec). */
export async function adminUpdateEvent(eventId: string, input: EventDraftInput): Promise<EventActionResult> {
  const actor = await requireEventManager();
  const parsed = eventDraftSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!existing) return { success: false, error: "Event not found." };

  await prisma.event.update({ where: { id: eventId }, data: draftToWriteData(parsed.data) });

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/events");
  return { success: true, eventId };
}

export async function deleteEvent(eventId: string): Promise<EventActionResult> {
  const actor = await requireCurrentMember();
  const existing = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId } });
  if (!existing) return { success: false, error: "Event not found." };

  const isManager = hasPermission(actor.systemRole, "events.manage");
  if (existing.createdById !== actor.id && !isManager) return { success: false, error: "Not authorized." };
  if (existing.status !== "DRAFT" && !isManager) return { success: false, error: "Only draft proposals can be deleted." };

  await prisma.event.delete({ where: { id: eventId } });

  revalidatePath("/events");
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rsvpToEvent(eventId: string, status: string): Promise<EventActionResult> {
  const actor = await requireCurrentMember();

  const parsed = rsvpSchema.safeParse({ status });
  if (!parsed.success) return { success: false, error: "Invalid RSVP status." };
  // Members choose GOING/MAYBE/NOT_GOING from the UI; WAITLISTED is only ever
  // assigned by the server when capacity is full — see joinEventWaitlist.
  if (parsed.data.status === "WAITLISTED") return { success: false, error: "Invalid RSVP status." };

  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: actor.organizationId, status: "PUBLISHED" } });
  if (!event) return { success: false, error: "Event not found." };

  const result = await rsvpMemberToEvent(eventId, actor.id, parsed.data.status);
  if (result.outcome === "not_found") return { success: false, error: "Event not found." };
  if (result.outcome === "closed") return { success: false, error: "Registration for this event has closed." };

  if (result.status === "GOING" && !result.wasGoingBefore && actor.notifyEmail) {
    await EmailService.sendEventRegistrationEmail({
      to: actor.email,
      fullName: actor.fullName,
      eventTitle: event.title,
      startTime: event.startTime,
      location: event.location,
      organizationId: actor.organizationId,
      memberId: actor.id,
    });
  }

  if (result.status !== "GOING" && result.wasGoingBefore) {
    await notifyWaitlistPromotion(eventId);
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return { success: true, status: result.status };
}

/** Notifies whoever gets bumped off the waitlist — the promotion itself already happened inside rsvpMemberToEvent. */
async function notifyWaitlistPromotion(eventId: string) {
  const promotion = await promoteFromWaitlist(eventId);
  if (!promotion) return;

  await notifyMembers([promotion.memberId], {
    type: "EVENT_WAITLIST_PROMOTED",
    title: `A spot opened up for ${promotion.eventTitle}`,
    link: `/events/${eventId}`,
  });

  const member = await prisma.member.findUnique({
    where: { id: promotion.memberId },
    select: { email: true, fullName: true, notifyEmail: true, organizationId: true },
  });
  if (member?.notifyEmail) {
    await EmailService.sendEventRegistrationEmail({
      to: member.email,
      fullName: member.fullName,
      eventTitle: promotion.eventTitle,
      startTime: promotion.startTime,
      location: promotion.location,
      organizationId: member.organizationId,
      memberId: promotion.memberId,
    });
  }
}
