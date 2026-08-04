"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/db/activity-log";
import { logAudit } from "@/lib/db/audit-log";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { getKioskOrganizationId } from "@/features/kiosk/config";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { EmailService } from "@/lib/email/email-service";
import { visitorSchema, type VisitorInput } from "@/features/visitors/schemas/visitor.schema";

export type RegisterVisitorResult =
  | { success: true; visitorId: string; qrToken: string }
  | { success: false; error: string };

/**
 * Public, unauthenticated — same trust model as the kiosk's member check-in.
 * The visitor is placed in WAITING status; front-desk staff resolve it from
 * /kiosk/admin (approve onto site, or check out) since there's no host to
 * auto-notify in this version (see plan: "Meeting With" was dropped to avoid
 * exposing the member list at an unattended kiosk).
 */
export async function registerVisitor(input: VisitorInput): Promise<RegisterVisitorResult> {
  const parsed = visitorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const organizationId = getKioskOrganizationId();
  const data = parsed.data;

  const visitor = await prisma.visitor.create({
    data: {
      organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
      reasonForVisit: data.reasonForVisit,
      visitorType: data.visitorType,
      expectedTimeLeaving: data.expectedTimeLeaving ? new Date(data.expectedTimeLeaving) : null,
      termsAcceptedAt: new Date(),
    },
  });

  const qrAsset = await ensureQRAsset({ type: "VISITOR", visitorId: visitor.id });

  await logActivity({
    organizationId,
    action: "visitor.registered",
    entityType: "visitor",
    entityId: visitor.id,
    metadata: { firstName: data.firstName, lastName: data.lastName, visitorType: data.visitorType },
  });
  await logAudit({
    organizationId,
    action: "visitor.registered",
    entityType: "visitor",
    entityId: visitor.id,
    after: { firstName: data.firstName, lastName: data.lastName, visitorType: data.visitorType },
  });

  // No "host" concept — visitor registration is unauthenticated kiosk input
  // with no member to attribute the visit to. Notified instead: front-desk
  // staff (checkin.manage) who opted into notifyVisitorArrivals, since
  // they're the ones who can act on it from /kiosk/admin.
  const staff = await prisma.member.findMany({
    where: { organizationId, status: "ACTIVE", notifyVisitorArrivals: true },
    select: { id: true, fullName: true, email: true, systemRole: true },
  });
  const recipients = staff.filter((m) => hasPermission(m.systemRole, "checkin.manage"));
  const visitorName = `${data.firstName} ${data.lastName}`;
  await Promise.all(
    recipients.map((recipient) =>
      EmailService.sendVisitorArrivalEmail({
        to: recipient.email,
        recipientFullName: recipient.fullName,
        visitorName,
        visitorCompany: data.company || null,
        arrivedAt: new Date(),
        organizationId,
        memberId: recipient.id,
      })
    )
  );

  revalidatePath("/kiosk/admin");
  return { success: true, visitorId: visitor.id, qrToken: qrAsset.token };
}

async function requireCheckinManager() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "checkin.manage")) {
    throw new Error("You don't have permission to manage check-ins.");
  }
  return actor;
}

export async function approveVisitor(visitorId: string): Promise<{ success: boolean; error?: string }> {
  const actor = await requireCheckinManager();

  const visitor = await prisma.visitor.findFirst({
    where: { id: visitorId, organizationId: actor.organizationId },
  });
  if (!visitor) return { success: false, error: "Visitor not found." };

  await prisma.visitor.update({
    where: { id: visitorId },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  revalidatePath("/kiosk/admin");
  return { success: true };
}

export async function checkOutVisitor(visitorId: string): Promise<{ success: boolean; error?: string }> {
  const actor = await requireCheckinManager();

  const visitor = await prisma.visitor.findFirst({
    where: { id: visitorId, organizationId: actor.organizationId },
  });
  if (!visitor) return { success: false, error: "Visitor not found." };

  await prisma.visitor.update({
    where: { id: visitorId },
    data: { status: "CHECKED_OUT", checkedOutAt: new Date() },
  });

  revalidatePath("/kiosk/admin");
  return { success: true };
}
