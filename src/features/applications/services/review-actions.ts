"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { EmailService } from "@/lib/email/email-service";
import { generateMemberNumber, isUniqueConstraintError, isUniqueConstraintErrorOnField } from "@/features/members/services/member-number";
import { normalizeEmail } from "@/lib/utils/email";
import { provisionMemberOnboarding } from "@/features/members/services/onboarding";
import { formatLocation } from "@/features/applications/utils/location";
import { instagramUrl, tiktokUrl, youtubeUrl } from "@/lib/utils/social-links";
import { materializeLegalAcceptancesForMember } from "@/features/legal/services/legal.service";
import { connectReferralOnApproval } from "@/features/referrals/services/referral.service";
import { checkAgencyDuplicate } from "@/features/agencies/services/agency-duplicate.service";
import { requestAgencyAccess } from "@/features/agencies/services/agency-access.service";
import { acceptAgencyInvitation } from "@/features/agencies/services/agency-invitations.service";
import { isReferralEligibleRole } from "@/features/referrals/config/referral-config";
import { wasEmailAlreadySent } from "@/lib/email/idempotency";

export type ApplicationReviewResult =
  | { success: true; onboardingNote?: string }
  | { success: false; error: string };

async function requireApprover() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.approve")) {
    throw new Error("You don't have permission to review applications.");
  }
  return actor;
}

async function resolveCompanyId(organizationId: string, companyName: string | null): Promise<string | null> {
  const trimmed = companyName?.trim();
  if (!trimmed) return null;

  const existing = await prisma.company.findFirst({
    where: { organizationId, name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;

  return (await prisma.company.create({ data: { organizationId, name: trimmed } })).id;
}

/**
 * The one place a MembershipApplication actually turns into a Member —
 * creates the Member, then hands off to provisionMemberOnboarding (the same
 * QR + Supabase account + Welcome email path createMember uses) rather than
 * duplicating any of that.
 */
export async function approveApplicationAction(applicationId: string): Promise<ApplicationReviewResult> {
  let actor;
  try {
    actor = await requireApprover();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const application = await prisma.membershipApplication.findFirst({
    where: { id: applicationId, organizationId: actor.organizationId },
  });
  if (!application) return { success: false, error: "Application not found." };
  if (application.status !== "PENDING") return { success: false, error: "This application has already been reviewed." };

  // "Agency Uniqueness" — re-checked at approval time (not just at submit),
  // since two separate applications for the same agency can both be PENDING
  // simultaneously without either colliding with an ACTIVE member yet.
  // Whichever gets approved first wins; approving the second is blocked
  // here. Skipped entirely when the applicant already chose "Request Access
  // to Existing Agency" at submit time — that's the Existing Agency Claim
  // Workflow's job (see below), not a block.
  if (!application.claimedAgencyId) {
    const duplicateCheck = await checkAgencyDuplicate(actor.organizationId, application.role, {
      businessName: application.company || application.fullName,
      website: application.website,
      businessRegistrationNumber: application.businessRegistrationNumber,
    });
    if (duplicateCheck.duplicate) {
      return {
        success: false,
        error: `This agency already exists in CreatorHub360 (matches "${duplicateCheck.matches[0].existingAgency.fullName}"). Review the existing agency at /members/${duplicateCheck.matches[0].existingAgency.id} instead of approving this as a new one.`,
      };
    }
  }

  // Everything below is real account/data creation (Supabase user, Member
  // row, QR asset) — surface the real error message on failure rather than
  // a generic one, per explicit instruction. Email delivery failure is
  // handled separately inside provisionMemberOnboarding and never throws.
  try {
    const companyId = await resolveCompanyId(actor.organizationId, application.company);

    let member;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        member = await prisma.member.create({
          data: {
            organizationId: actor.organizationId,
            memberNumber: await generateMemberNumber(),
            fullName: application.fullName,
            email: normalizeEmail(application.email),
            phone: application.phone,
            role: application.role,
            status: "ACTIVE",
            companyId,
            instagramUrl: instagramUrl(application.instagram),
            tiktokUrl: tiktokUrl(application.tiktok),
            youtubeUrl: youtubeUrl(application.youtube),
            location: formatLocation(application.city, application.state, application.country),
            approvedById: actor.id,
            approvedAt: new Date(),
            // "Every agency must always have at least one OWNER" — a brand-new
            // canonical agency identity starts as its own Owner. Skipped when
            // claiming an existing agency (they get whatever role that agency
            // grants on approval, never their own Owner slot) or when the role
            // isn't referral-eligible (team roles are meaningless there).
            agencyRole: !application.claimedAgencyId && isReferralEligibleRole(application.role) ? "OWNER" : undefined,
          },
        });
        break;
      } catch (error) {
        if (isUniqueConstraintErrorOnField(error, "email")) {
          return { success: false, error: "A member with this email already exists." };
        }
        if (isUniqueConstraintError(error) && attempt < 2) continue;
        if (isUniqueConstraintError(error)) {
          return { success: false, error: "A member with this email already exists." };
        }
        throw error;
      }
    }
    if (!member) return { success: false, error: "Could not create member. Please try again." };

    // "Agency Invitations" — the invitation itself IS the approval, so this
    // joins the team directly rather than creating a pending
    // AgencyAccessRequest. Falls through to the self-service claim branch
    // below if the invitation somehow expired between submit and approval.
    if (application.agencyInviteToken) {
      const acceptResult = await acceptAgencyInvitation(actor.organizationId, application.agencyInviteToken, member.id);
      if (!acceptResult.success && application.claimedAgencyId && application.claimedAgencyRole) {
        await requestAgencyAccess(
          actor.organizationId,
          application.claimedAgencyId,
          member.id,
          application.claimedAgencyRole,
          application.claimRequestNote ?? undefined
        );
      }
    } else if (application.claimedAgencyId && application.claimedAgencyRole) {
      // "Existing Agency Claim Workflow" — the applicant chose "Request
      // Access to Existing Agency" instead of registering a duplicate.
      // Creates the PENDING AgencyAccessRequest and notifies that agency's
      // admins; the new Member's agencyId stays null until that agency
      // approves (see approveAgencyAccessRequestAction), never touching
      // referralCode.
      const accessResult = await requestAgencyAccess(
        actor.organizationId,
        application.claimedAgencyId,
        member.id,
        application.claimedAgencyRole,
        application.claimRequestNote ?? undefined
      );
      if (accessResult.success) {
        await logAudit({
          organizationId: actor.organizationId,
          actorId: member.id,
          action: "agency.access_requested",
          entityType: "member",
          entityId: member.id,
          after: { agencyId: application.claimedAgencyId, agencyName: accessResult.agencyName, role: application.claimedAgencyRole },
        });
      }
    }

    await materializeLegalAcceptancesForMember(application.id, member.id);

    // "Application is permanently linked to AGY-001284 ... Member profile
    // retains Agency ID" — the only place Member.referredByMemberId is ever
    // set for a brand-new member automatically (see connectReferralOnApproval's
    // own comment for why this makes duplicate assignment impossible by
    // construction). No-ops if the application never had a referral code.
    // MANUAL_ENTRY referrals don't connect here — they become a pending
    // agency-approval request instead (logged distinctly so the audit trail
    // reflects what actually happened).
    const referralLink = await connectReferralOnApproval(application.id, member.id);
    if (referralLink) {
      await logAudit({
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: referralLink.status === "ACTIVE" ? "referral.connected" : "referral.request_pending",
        entityType: "member",
        entityId: member.id,
        after: { referralCode: referralLink.referralCode, referrerMemberId: referralLink.referrerMemberId, status: referralLink.status },
      });
    }

    const { onboardingNote } = await provisionMemberOnboarding(member, {
      emailTemplate: "application_approved",
      actorId: actor.id,
      skipReferralCode: Boolean(application.claimedAgencyId),
    });

    // Second, separate email in the two-email acceptance flow — the
    // CreatorHub360 welcome newsletter (informational artwork, no
    // login/account details). Independent of the account/access email sent
    // by provisionMemberOnboarding above: guarded by its own EmailLog check
    // so a retry of this whole action can't double-send either email
    // independently of the other. Never blocks approval — EmailService
    // never throws on delivery failure.
    //
    // Creator-only: the newsletter's content ("You've been accepted to our
    // invite only community" / creator-specific mission and asks) is written
    // for content creators specifically, not Brands/Agencies/Brokers/etc. —
    // application.role is the existing Creator-Type field (MemberRole enum,
    // reused verbatim as Member.role on the row created above), so no new
    // field was added to gate this.
    if (
      application.role === "CREATOR" &&
      !(await wasEmailAlreadySent(actor.organizationId, member.id, "welcome_newsletter"))
    ) {
      await EmailService.sendWelcomeNewsletterEmail({
        to: member.email,
        organizationId: actor.organizationId,
        memberId: member.id,
        sentBy: actor.id,
      });
    }

    // Notes are managed independently (updateApplicationNotesAction, auto-saved
    // as the admin types) — approval never overwrites whatever's already there.
    await prisma.membershipApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: actor.id },
    });

    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "application.approved",
      entityType: "membership_application",
      entityId: application.id,
      before: { status: "PENDING" },
      after: { status: "APPROVED", memberId: member.id },
    });

    revalidatePath("/admin/applications");
    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath("/members");

    return { success: true, onboardingNote };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Approval failed. Please try again." };
  }
}

/**
 * `reason` is the admin's internal rejection reason (required) — it's
 * persisted to `notes` and written to the audit log, but deliberately never
 * passed into the rejection email's props: application_rejected has fixed
 * copy with no per-application reason placeholder, so there's nothing for
 * it to interpolate into even if a future change added one.
 */
export async function rejectApplicationAction(applicationId: string, reason: string): Promise<ApplicationReviewResult> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) return { success: false, error: "A rejection reason is required." };

  let actor;
  try {
    actor = await requireApprover();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const application = await prisma.membershipApplication.findFirst({
    where: { id: applicationId, organizationId: actor.organizationId },
  });
  if (!application) return { success: false, error: "Application not found." };
  if (application.status !== "PENDING") return { success: false, error: "This application has already been reviewed." };

  await prisma.membershipApplication.update({
    where: { id: application.id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: actor.id,
      notes: trimmedReason,
      notesUpdatedAt: new Date(),
      notesUpdatedById: actor.id,
    },
  });

  // Referral link never connects to a Member on this path — just mark it
  // REJECTED so it stops showing up as a pending creator request on the
  // referring agency's dashboard.
  await prisma.referralLink.updateMany({
    where: { applicationId: application.id, status: "PENDING" },
    data: { status: "REJECTED", rejectedAt: new Date() },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "application.rejected",
    entityType: "membership_application",
    entityId: application.id,
    before: { status: "PENDING" },
    after: { status: "REJECTED", reason: trimmedReason },
  });

  await EmailService.sendApplicationRejectedEmail({
    to: application.email,
    fullName: application.fullName,
    organizationId: actor.organizationId,
    sentBy: actor.id,
  });

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true };
}

export type UpdateNotesResult =
  | { success: true; updatedAt: string; updatedByName: string }
  | { success: false; error: string };

/**
 * Notes are editable regardless of application status — "Notes persist
 * after approval or rejection" — unlike approve/reject this never checks
 * `status === "PENDING"`. Each save writes one audit entry (the client
 * debounces, so this fires on idle, not per keystroke).
 */
export async function updateApplicationNotesAction(applicationId: string, notes: string): Promise<UpdateNotesResult> {
  let actor;
  try {
    actor = await requireApprover();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authorized." };
  }

  const application = await prisma.membershipApplication.findFirst({
    where: { id: applicationId, organizationId: actor.organizationId },
    select: { id: true, notes: true },
  });
  if (!application) return { success: false, error: "Application not found." };

  const trimmed = notes.trim() || null;
  const now = new Date();

  await prisma.membershipApplication.update({
    where: { id: application.id },
    data: { notes: trimmed, notesUpdatedAt: now, notesUpdatedById: actor.id },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "application.notes_updated",
    entityType: "membership_application",
    entityId: application.id,
    before: { notes: application.notes },
    after: { notes: trimmed },
  });

  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true, updatedAt: now.toISOString(), updatedByName: actor.fullName };
}
