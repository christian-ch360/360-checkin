import "server-only";

import { randomBytes } from "crypto";
import { addDays } from "date-fns";
import { prisma } from "@/lib/db/prisma";

export async function listInvitations(organizationId: string) {
  return prisma.invitation.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export function generateInvitationToken() {
  return randomBytes(24).toString("hex");
}

export function defaultInvitationExpiry() {
  return addDays(new Date(), 7);
}

/**
 * Looks up an invitation by token for the accept-invite flow at signup.
 * Treats an expired PENDING row as invalid without requiring a background
 * job to have flipped its status to EXPIRED first — this app has no
 * scheduled jobs, so expiry is always checked lazily like this.
 */
export async function getValidInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) return null;
  if (invitation.status !== "PENDING") return null;
  if (invitation.expiresAt < new Date()) return null;
  return invitation;
}
