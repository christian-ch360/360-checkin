import "server-only";

import type { Invitation } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateMemberNumber, isUniqueConstraintError, isUniqueConstraintErrorOnField } from "@/features/members/services/member-number";
import { normalizeEmail } from "@/lib/utils/email";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { EmailService } from "@/lib/email/email-service";
import type { SignupInput } from "@/features/auth/schemas/auth.schema";
import { instagramUrl, tiktokUrl, youtubeUrl, linkedinUrl } from "@/lib/utils/social-links";
import { buildAcceptanceInputsFromRequest, recordMemberLegalAcceptances } from "@/features/legal/services/legal.service";
import { requestOrConnectAgency } from "@/features/referrals/services/referral.service";
import { checkAgencyDuplicate, AgencyDuplicateError } from "@/features/agencies/services/agency-duplicate.service";
import { requestAgencyAccess } from "@/features/agencies/services/agency-access.service";
import { logAudit } from "@/lib/db/audit-log";
import { isReferralEligibleRole } from "@/features/referrals/config/referral-config";

const MAX_MEMBER_NUMBER_RETRIES = 5;

/**
 * Creates the Member record for a brand-new Supabase auth user completing an
 * admin invitation — the only path left that reaches this function now that
 * public self-service signup has been replaced by MembershipApplication
 * (see features/applications). An admin invitation IS the approval, so this
 * always creates the member ACTIVE, with systemRole taken from the
 * invitation, and marks the invitation ACCEPTED in the same call.
 */
export async function createMemberFromSignup(authUserId: string, input: SignupInput, invitation: Invitation) {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!organization) {
    throw new Error("No organization exists to attach this application to.");
  }

  let companyId: string | null = null;
  const companyName = input.companyName?.trim();
  if (companyName) {
    const existing = await prisma.company.findFirst({
      where: { organizationId: organization.id, name: { equals: companyName, mode: "insensitive" } },
      select: { id: true },
    });
    companyId = existing
      ? existing.id
      : (await prisma.company.create({ data: { organizationId: organization.id, name: companyName } })).id;
  }

  const isCreator = input.appliedRole === "CREATOR";
  const platforms = isCreator && input.platforms
    ? input.platforms.split(",").map((p) => p.trim()).filter(Boolean)
    : [];
  const followerCount =
    isCreator && input.followerCount ? Number.parseInt(input.followerCount, 10) || null : null;

  // "Agency Uniqueness" — checked before any Member row is created. No-ops
  // for non-referral-eligible roles. A duplicate isn't necessarily a block:
  // if the applicant chose "Request Access to Existing Agency" (claimAgencyId
  // matches an actual match), signup proceeds and the claim is honored right
  // after the Member is created, below.
  const duplicateCheck = await checkAgencyDuplicate(organization.id, input.appliedRole, {
    businessName: companyName || input.fullName,
    website: input.website,
    businessRegistrationNumber: input.businessRegistrationNumber,
  });
  const claimedMatch = duplicateCheck.duplicate && input.claimAgencyId
    ? duplicateCheck.matches.find((m) => m.existingAgency.id === input.claimAgencyId)
    : undefined;
  if (duplicateCheck.duplicate && !claimedMatch) {
    throw new AgencyDuplicateError(
      "This agency already exists in CreatorHub360.",
      duplicateCheck.matches[0].existingAgency.id,
      duplicateCheck.matches[0].existingAgency.fullName
    );
  }

  let member;
  for (let attempt = 0; attempt < MAX_MEMBER_NUMBER_RETRIES; attempt++) {
    try {
      member = await prisma.member.create({
        data: {
          organizationId: organization.id,
          memberNumber: await generateMemberNumber(),
          authUserId,
          fullName: input.fullName,
          email: normalizeEmail(input.email),
          phone: input.phone || null,
          companyId,
          role: input.appliedRole,
          status: "ACTIVE",
          systemRole: invitation.role,
          approvedAt: new Date(),
          bio: input.bio || null,
          instagramUrl: instagramUrl(input.instagramUrl),
          tiktokUrl: tiktokUrl(input.tiktokUrl),
          youtubeUrl: youtubeUrl(input.youtubeUrl),
          linkedinUrl: linkedinUrl(input.linkedinUrl),
          followerCount,
          platforms,
          website: input.website || null,
          businessRegistrationNumber: input.businessRegistrationNumber || null,
          // "Every agency must always have at least one OWNER" — skipped
          // when claiming an existing agency, same reasoning as Apply.
          agencyRole: !claimedMatch && isReferralEligibleRole(input.appliedRole) ? "OWNER" : undefined,
        },
      });
      break;
    } catch (err) {
      // An email collision is never a memberNumber race — retrying just
      // burns attempts before rethrowing the same error, so bail out
      // immediately and let the caller (signupAction) turn it into the
      // friendly "already registered" message.
      if (isUniqueConstraintErrorOnField(err, "email")) throw err;
      if (isUniqueConstraintError(err) && attempt < MAX_MEMBER_NUMBER_RETRIES - 1) continue;
      throw err;
    }
  }
  if (!member) throw new Error("Failed to create member application.");

  // "Existing Agency Claim Workflow" — honors the request chosen above;
  // never touches referralCode, so "they inherit the agency's existing
  // Agency ID" holds by construction rather than being faked here.
  if (claimedMatch && input.claimAgencyRole) {
    const accessResult = await requestAgencyAccess(
      organization.id,
      claimedMatch.existingAgency.id,
      member.id,
      input.claimAgencyRole,
      input.claimRequestNote
    );
    if (accessResult.success) {
      await logAudit({
        organizationId: organization.id,
        actorId: member.id,
        action: "agency.access_requested",
        entityType: "member",
        entityId: member.id,
        after: { agencyId: claimedMatch.existingAgency.id, agencyName: accessResult.agencyName, role: input.claimAgencyRole },
      });
    }
  }

  await recordMemberLegalAcceptances(member.id, await buildAcceptanceInputsFromRequest(organization.id));

  // "If a creator manually enters an Agency ID during ... Signup ... DO NOT
  // automatically connect them" — always MANUAL_ENTRY here, so this creates
  // a pending agency-approval request (or silently no-ops on an invalid/
  // stale code) rather than ever setting Member.referredByMemberId directly.
  if (input.agencyCode?.trim()) {
    await requestOrConnectAgency(organization.id, member.id, input.agencyCode, "MANUAL_ENTRY");
  }

  await ensureQRAsset({ type: "MEMBER", memberId: member.id });

  await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } });
  await EmailService.sendMembershipApprovedEmail({
    to: member.email,
    fullName: member.fullName,
    organizationId: member.organizationId,
    memberId: member.id,
  });

  return member;
}
