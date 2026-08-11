"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { isAgencyAdmin } from "@/features/agencies/services/agency-access.service";
import {
  createBrandInvitation,
  revokeBrandInvitation,
  acceptBrandInvitation,
  declineBrandInvitation,
  type BrandInvitationActionResult,
  type BrandInvitationSimpleResult,
  type AcceptBrandInvitationResult,
} from "@/features/agencies/services/brand-invitations.service";

async function requireBrandInviteAdmin(brandId: string) {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);

  const brand = await prisma.brand.findFirst({ where: { id: brandId, organizationId: actor.organizationId } });
  if (!brand) return { actor, agencyId, allowed: false as const, error: "Brand not found." };
  if (!isAgencyAdmin(actor, agencyId)) {
    return { actor, agencyId, allowed: false as const, error: "Only an Owner, Admin, or Manager can invite brand contacts." };
  }
  return { actor, agencyId, allowed: true as const };
}

export async function inviteBrandContactAction(brandId: string, fullName: string, email: string): Promise<BrandInvitationActionResult> {
  const check = await requireBrandInviteAdmin(brandId);
  if (!check.allowed) return { success: false, error: check.error };

  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim();
  if (!trimmedName) return { success: false, error: "Enter a full name." };
  if (!trimmedEmail || !trimmedEmail.includes("@")) return { success: false, error: "Enter a valid email address." };

  const result = await createBrandInvitation(check.actor.organizationId, brandId, check.agencyId, trimmedName, trimmedEmail, check.actor.id);
  if (result.success) revalidatePath(`/agency/brands/${brandId}`);
  return result;
}

export async function revokeBrandInvitationAction(invitationId: string): Promise<BrandInvitationSimpleResult> {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);

  const invitation = await prisma.brandInvitation.findFirst({ where: { id: invitationId, organizationId: actor.organizationId } });
  if (!invitation) return { success: false, error: "Invitation not found." };
  if (!isAgencyAdmin(actor, agencyId)) {
    return { success: false, error: "Only an Owner, Admin, or Manager can manage invitations." };
  }

  const result = await revokeBrandInvitation(actor.organizationId, invitationId, actor.id);
  if (result.success) revalidatePath(`/agency/brands/${invitation.brandId}`);
  return result;
}

/** Called from the invite-accept page by an already-authenticated member. */
export async function acceptBrandInvitationAction(token: string): Promise<AcceptBrandInvitationResult> {
  const actor = await requireCurrentMember();
  const result = await acceptBrandInvitation(actor.organizationId, token, actor.id);
  if (result.success) revalidatePath("/agency");
  return result;
}

/** Public — no account required, matching the accept page's trust model for the "not interested" path. */
export async function declineBrandInvitationAction(token: string): Promise<BrandInvitationSimpleResult> {
  return declineBrandInvitation(token);
}
