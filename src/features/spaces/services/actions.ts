"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { SpaceType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import {
  endSpaceSession as endSpaceSessionService,
  getSpaceBookingImpact,
} from "@/features/spaces/services/spaces.service";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { requireActiveMembership } from "@/lib/permissions/membership-gate";
import { requireSpaceTypeAccess } from "@/features/spaces/services/space-membership-gate";
import { requireLegalCompliance } from "@/lib/permissions/legal-gate";
import { logActivity } from "@/lib/db/activity-log";
import { logAudit } from "@/lib/db/audit-log";
import { EmailService } from "@/lib/email/email-service";

export type SpaceActionResult =
  | { success: true; spaceName?: string; durationMin?: number }
  | { success: false; error: string };

export async function endSpaceSessionAction(sessionId: string): Promise<SpaceActionResult> {
  const actor = await requireCurrentMember();
  const result = await endSpaceSessionService(sessionId, {
    id: actor.id,
    organizationId: actor.organizationId,
    canManageSpaces: hasPermission(actor.systemRole, "spaces.manage"),
  });
  if ("error" in result) return { success: false, error: result.error };

  revalidatePath("/spaces");
  revalidatePath(`/spaces/${result.session.spaceId}`);
  revalidateTag("spaces");
  return { success: true, durationMin: result.session.durationMin ?? undefined };
}

const spaceSchema = z.object({
  name: z.string().min(2),
  type: z.nativeEnum(SpaceType),
  capacity: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  // Comma-separated free text in the form (e.g. "Ring light, Tripod, Mic") —
  // split/trimmed into the schema's String[] here rather than building a
  // dedicated tag-picker component for a field this simple.
  equipment: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  displayOrder: z.string().optional().or(z.literal("")),
});

export type CreateSpaceInput = z.infer<typeof spaceSchema>;

function parseEquipment(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export async function createSpace(input: CreateSpaceInput): Promise<SpaceActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "spaces.manage")) {
    return { success: false, error: "You don't have permission to manage spaces." };
  }

  const parsed = spaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // New spaces default to the end of the list unless the admin picks a
  // specific position, so they don't silently jump ahead of everything else.
  let displayOrder: number;
  if (parsed.data.displayOrder) {
    displayOrder = Number(parsed.data.displayOrder);
  } else {
    const maxOrder = await prisma.space.aggregate({
      where: { organizationId: actor.organizationId },
      _max: { displayOrder: true },
    });
    displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
  }

  const space = await prisma.space.create({
    data: {
      organizationId: actor.organizationId,
      name: parsed.data.name,
      type: parsed.data.type,
      capacity: parsed.data.capacity ? Number(parsed.data.capacity) : null,
      location: parsed.data.location || null,
      description: parsed.data.description || null,
      equipment: parseEquipment(parsed.data.equipment),
      imageUrl: parsed.data.imageUrl || null,
      isActive: parsed.data.isActive ?? true,
      displayOrder,
    },
  });

  await ensureQRAsset({ type: "SPACE", spaceId: space.id });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "space.created",
    entityType: "space",
    entityId: space.id,
    after: { name: space.name, type: space.type },
  });
  revalidatePath("/spaces");
  revalidateTag("spaces");
  return { success: true, spaceName: space.name };
}

export async function updateSpace(spaceId: string, input: CreateSpaceInput): Promise<SpaceActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "spaces.manage")) {
    return { success: false, error: "You don't have permission to manage spaces." };
  }

  const existing = await prisma.space.findFirst({ where: { id: spaceId, organizationId: actor.organizationId } });
  if (!existing) return { success: false, error: "Space not found." };

  const parsed = spaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const space = await prisma.space.update({
    where: { id: spaceId },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      capacity: parsed.data.capacity ? Number(parsed.data.capacity) : null,
      location: parsed.data.location || null,
      description: parsed.data.description || null,
      equipment: parseEquipment(parsed.data.equipment),
      imageUrl: parsed.data.imageUrl || null,
      isActive: parsed.data.isActive ?? existing.isActive,
      displayOrder: parsed.data.displayOrder ? Number(parsed.data.displayOrder) : existing.displayOrder,
    },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "space.updated",
    entityType: "space",
    entityId: space.id,
    before: { name: existing.name, type: existing.type, isActive: existing.isActive },
    after: { name: space.name, type: space.type, isActive: space.isActive },
  });
  revalidatePath("/spaces");
  revalidatePath(`/spaces/${spaceId}`);
  revalidateTag("spaces");
  return { success: true, spaceName: space.name };
}

export async function archiveSpaceAction(spaceId: string): Promise<SpaceActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "spaces.manage")) {
    return { success: false, error: "You don't have permission to manage spaces." };
  }

  const existing = await prisma.space.findFirst({ where: { id: spaceId, organizationId: actor.organizationId } });
  if (!existing) return { success: false, error: "Space not found." };
  if (!existing.isActive) return { success: false, error: "This space is already archived." };

  await prisma.space.update({ where: { id: spaceId }, data: { isActive: false } });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "space.archived",
    entityType: "space",
    entityId: spaceId,
    before: { isActive: true },
    after: { isActive: false },
  });

  revalidatePath("/spaces");
  revalidatePath(`/spaces/${spaceId}`);
  revalidateTag("spaces");
  return { success: true, spaceName: existing.name };
}

export async function restoreSpaceAction(spaceId: string): Promise<SpaceActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "spaces.manage")) {
    return { success: false, error: "You don't have permission to manage spaces." };
  }

  const existing = await prisma.space.findFirst({ where: { id: spaceId, organizationId: actor.organizationId } });
  if (!existing) return { success: false, error: "Space not found." };
  if (existing.isActive) return { success: false, error: "This space isn't archived." };

  await prisma.space.update({ where: { id: spaceId }, data: { isActive: true } });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "space.restored",
    entityType: "space",
    entityId: spaceId,
    before: { isActive: false },
    after: { isActive: true },
  });

  revalidatePath("/spaces");
  revalidatePath(`/spaces/${spaceId}`);
  revalidateTag("spaces");
  return { success: true, spaceName: existing.name };
}

export type SpaceBookingImpactResult =
  | { success: true; reservationCount: number; sessionCount: number }
  | { success: false; error: string };

export async function getSpaceBookingImpactAction(spaceId: string): Promise<SpaceBookingImpactResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "spaces.delete")) {
    return { success: false, error: "You don't have permission to delete spaces." };
  }

  const existing = await prisma.space.findFirst({ where: { id: spaceId, organizationId: actor.organizationId } });
  if (!existing) return { success: false, error: "Space not found." };

  const impact = await getSpaceBookingImpact(actor.organizationId, spaceId);
  return { success: true, ...impact };
}

/** Permanent, cascade-deletes reservations/sessions/QR asset — Super Admin only. */
export async function deleteSpaceAction(spaceId: string): Promise<SpaceActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "spaces.delete")) {
    return { success: false, error: "Only Super Admins can permanently delete a space." };
  }

  const existing = await prisma.space.findFirst({ where: { id: spaceId, organizationId: actor.organizationId } });
  if (!existing) return { success: false, error: "Space not found." };

  const impact = await getSpaceBookingImpact(actor.organizationId, spaceId);

  await prisma.space.delete({ where: { id: spaceId } });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "space.deleted",
    entityType: "space",
    entityId: spaceId,
    before: { name: existing.name, type: existing.type, ...impact },
  });

  revalidatePath("/spaces");
  revalidateTag("spaces");
  return { success: true, spaceName: existing.name };
}

export async function reorderSpacesAction(orderedIds: string[]): Promise<SpaceActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "spaces.manage")) {
    return { success: false, error: "You don't have permission to manage spaces." };
  }

  const rows = await prisma.space.findMany({ where: { organizationId: actor.organizationId, id: { in: orderedIds } } });
  if (rows.length !== orderedIds.length) {
    return { success: false, error: "One or more spaces were not found." };
  }

  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.space.update({ where: { id }, data: { displayOrder: index } }))
  );
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "space.reordered",
    entityType: "space",
    entityId: actor.organizationId,
    after: { orderedIds },
  });

  revalidatePath("/spaces");
  revalidateTag("spaces");
  return { success: true };
}

const reservationSchema = z
  .object({
    spaceId: z.string().uuid(),
    startTime: z.string(),
    endTime: z.string(),
    notes: z.string().optional(),
    projectId: z.string().uuid().optional().or(z.literal("")),
    attendeeIds: z.array(z.string().uuid()).optional(),
  })
  .refine((v) => !Number.isNaN(new Date(v.startTime).getTime()), { message: "Invalid start time", path: ["startTime"] })
  .refine((v) => !Number.isNaN(new Date(v.endTime).getTime()), { message: "Invalid end time", path: ["endTime"] });

export type BookSpaceInput = z.infer<typeof reservationSchema>;
export type BookSpaceResult = { success: true } | { success: false; error: string };

export async function bookSpace(input: BookSpaceInput): Promise<BookSpaceResult> {
  const actor = await requireCurrentMember();

  const membership = requireActiveMembership(actor);
  if (!membership.allowed) return { success: false, error: membership.reason! };

  const legal = await requireLegalCompliance(actor.organizationId, actor.id);
  if (!legal.allowed) return { success: false, error: legal.reason! };

  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const start = new Date(parsed.data.startTime);
  const end = new Date(parsed.data.endTime);

  if (end <= start) {
    return { success: false, error: "End time must be after start time." };
  }
  if (end < new Date()) {
    return { success: false, error: "You can't book a time in the past." };
  }

  const space = await prisma.space.findFirst({
    where: { id: parsed.data.spaceId, organizationId: actor.organizationId },
  });
  if (!space) return { success: false, error: "Space not found." };
  if (!space.isActive) return { success: false, error: "This space is archived and unavailable for booking." };

  const spaceAccess = await requireSpaceTypeAccess(actor.id, space.type);
  if (!spaceAccess.allowed) return { success: false, error: spaceAccess.reason };

  const overlapping = await prisma.reservation.findFirst({
    where: {
      spaceId: space.id,
      status: "CONFIRMED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });
  if (overlapping) {
    return { success: false, error: "This space is already booked for part of that time." };
  }

  let projectId: string | null = null;
  if (parsed.data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, organizationId: actor.organizationId },
      select: { id: true },
    });
    projectId = project?.id ?? null;
  }

  let attendeeIds: string[] = [];
  if (parsed.data.attendeeIds?.length) {
    const validMembers = await prisma.member.findMany({
      where: { id: { in: parsed.data.attendeeIds }, organizationId: actor.organizationId },
      select: { id: true },
    });
    attendeeIds = validMembers.map((m) => m.id);
  }

  const reservation = await prisma.reservation.create({
    data: {
      organizationId: actor.organizationId,
      spaceId: space.id,
      memberId: actor.id,
      startTime: start,
      endTime: end,
      notes: parsed.data.notes || null,
      projectId,
      attendees: attendeeIds.length ? { connect: attendeeIds.map((id) => ({ id })) } : undefined,
    },
    include: { project: { select: { name: true } } },
  });

  // Confirmation goes to the booker plus any attendees who opted in — each
  // recipient's own notifySpaceBookings preference gates whether they get
  // this, not the booker's.
  const recipients = await prisma.member.findMany({
    where: { id: { in: [actor.id, ...attendeeIds] }, notifySpaceBookings: true },
    select: { id: true, fullName: true, email: true },
  });
  await Promise.all(
    recipients.map((recipient) =>
      EmailService.sendReservationConfirmation({
        to: recipient.email,
        fullName: recipient.fullName,
        spaceName: space.name,
        startTime: start,
        endTime: end,
        projectName: reservation.project?.name ?? null,
        organizationId: actor.organizationId,
        memberId: recipient.id,
      })
    )
  );

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "space.booked",
    entityType: "reservation",
    entityId: reservation.id,
    metadata: { spaceName: space.name },
  });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "booking.created",
    entityType: "reservation",
    entityId: reservation.id,
    after: { spaceName: space.name, startTime: start.toISOString(), endTime: end.toISOString() },
  });

  revalidatePath("/spaces");
  revalidateTag("spaces");
  return { success: true };
}

export async function cancelReservation(reservationId: string): Promise<SpaceActionResult> {
  const actor = await requireCurrentMember();

  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, organizationId: actor.organizationId },
    include: {
      space: { select: { name: true } },
      member: { select: { id: true, email: true, fullName: true, notifySpaceBookings: true } },
      attendees: { select: { id: true, email: true, fullName: true, notifySpaceBookings: true } },
    },
  });
  if (!reservation) return { success: false, error: "Reservation not found." };
  if (reservation.status === "CANCELLED") return { success: false, error: "This reservation is already cancelled." };

  const canManage = hasPermission(actor.systemRole, "spaces.manage");
  if (reservation.memberId !== actor.id && !canManage) {
    return { success: false, error: "You don't have permission to cancel this reservation." };
  }

  await prisma.reservation.update({ where: { id: reservationId }, data: { status: "CANCELLED" } });

  const recipients = [reservation.member, ...reservation.attendees].filter((r) => r.notifySpaceBookings);
  for (const recipient of recipients) {
    await EmailService.sendReservationCancelledEmail({
      to: recipient.email,
      fullName: recipient.fullName,
      spaceName: reservation.space.name,
      startTime: reservation.startTime,
      organizationId: actor.organizationId,
      memberId: recipient.id,
    });
  }

  await logActivity({
    organizationId: actor.organizationId,
    memberId: actor.id,
    action: "space.booking_cancelled",
    entityType: "reservation",
    entityId: reservationId,
    metadata: { spaceName: reservation.space.name },
  });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "booking.cancelled",
    entityType: "reservation",
    entityId: reservationId,
    before: { status: reservation.status },
    after: { status: "CANCELLED" },
  });

  revalidatePath("/spaces");
  revalidateTag("spaces");
  return { success: true, spaceName: reservation.space.name };
}
