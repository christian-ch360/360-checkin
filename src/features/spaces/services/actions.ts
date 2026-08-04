"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { SpaceType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { endSpaceSession as endSpaceSessionService } from "@/features/spaces/services/spaces.service";
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
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export type CreateSpaceInput = z.infer<typeof spaceSchema>;

export async function createSpace(input: CreateSpaceInput): Promise<SpaceActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "spaces.manage")) {
    return { success: false, error: "You don't have permission to manage spaces." };
  }

  const parsed = spaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const space = await prisma.space.create({
    data: {
      organizationId: actor.organizationId,
      name: parsed.data.name,
      type: parsed.data.type,
      capacity: parsed.data.capacity ? Number(parsed.data.capacity) : null,
      location: parsed.data.location || null,
      imageUrl: parsed.data.imageUrl || null,
    },
  });

  await ensureQRAsset({ type: "SPACE", spaceId: space.id });
  revalidatePath("/spaces");
  revalidateTag("spaces");
  return { success: true, spaceName: space.name };
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
