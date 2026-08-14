import "server-only";

import { startOfDay, format } from "date-fns";
import type { MemberRole, MembershipApplicationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { EmailService } from "@/lib/email/email-service";
import { notifyMembers } from "@/lib/notifications";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { normalizeSocialHandleInput } from "@/lib/utils/social-links";
import type { ApplicationInput } from "@/features/applications/schemas/application.schema";
import { buildAcceptanceInputsFromRequest, recordApplicationLegalAcceptances } from "@/features/legal/services/legal.service";
import { createReferralLinkForApplication } from "@/features/referrals/services/referral.service";
import { checkAgencyDuplicate, AgencyDuplicateError } from "@/features/agencies/services/agency-duplicate.service";
import { getValidAgencyInvitation } from "@/features/agencies/services/agency-invitations.service";
import { findEmailConflict, applicationConflictMessage, EmailConflictError } from "@/features/members/services/email-lookup.service";
import { normalizeEmail } from "@/lib/utils/email";

/**
 * Creates the MembershipApplication row only — no Supabase auth user, no
 * Member row, no QR asset. Those only get created when an admin approves
 * (see approveApplicationAction), which is the entire point of splitting
 * "apply" from "onboard."
 */
export async function submitApplication(input: ApplicationInput) {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!organization) throw new Error("No organization exists to attach this application to.");

  // "Agency Invitations" — an invite link is authoritative: we already know
  // exactly which agency and role this applicant is joining, so there's
  // nothing to fuzzy-match by name/website for. Skips Agency Uniqueness
  // entirely when present and still valid.
  const invitation = input.agencyInviteToken ? await getValidAgencyInvitation(input.agencyInviteToken) : null;

  // "One email address can only belong to one CreatorHub360 account" —
  // checked before anything is created. Never exposes which case it is to
  // the caller directly; submitApplicationAction maps `conflict.kind` to
  // one of the three applicant-facing messages (in progress / already a
  // member / already used).
  const emailConflict = await findEmailConflict(organization.id, input.email);
  if (emailConflict) {
    throw new EmailConflictError(applicationConflictMessage(emailConflict), emailConflict);
  }

  let claimedMatch: { existingAgency: { id: string; fullName: string } } | undefined;
  if (!invitation) {
    // "Agency Uniqueness" — checked before the application row is even
    // created, using the business name/website/registration number the
    // applicant just typed. No-ops for non-referral-eligible roles.
    const duplicateCheck = await checkAgencyDuplicate(organization.id, input.role, {
      businessName: input.company || input.fullName,
      website: input.website,
      businessRegistrationNumber: input.businessRegistrationNumber,
    });
    // "Existing Agency Claim Workflow" — a duplicate isn't necessarily a
    // block: if the applicant explicitly chose "Request Access to Existing
    // Agency" (claimAgencyId matches one of the actual matches), the
    // application proceeds normally and the claim is honored at approval
    // time instead of creating a second agency record.
    claimedMatch = duplicateCheck.duplicate && input.claimAgencyId
      ? duplicateCheck.matches.find((m) => m.existingAgency.id === input.claimAgencyId)
      : undefined;
    if (duplicateCheck.duplicate && !claimedMatch) {
      throw new AgencyDuplicateError(
        "This agency already exists in CreatorHub360.",
        duplicateCheck.matches[0].existingAgency.id,
        duplicateCheck.matches[0].existingAgency.fullName
      );
    }
  }

  const applicationData: Prisma.MembershipApplicationUncheckedCreateInput = {
    organizationId: organization.id,
    fullName: input.fullName,
    email: normalizeEmail(input.email),
    phone: input.phone,
    role: input.role,
    company: input.company || null,
    website: input.website || null,
    businessRegistrationNumber: input.businessRegistrationNumber || null,
    // "N/A"/"NA"/"n/a"/"na" satisfy the required-field validation (the
    // applicant explicitly has no account) but must never be stored as the
    // literal typed text — normalized to the shared NO_ACCOUNT sentinel so
    // no render site ever mistakes it for a real handle.
    instagram: normalizeSocialHandleInput(input.instagram),
    tiktok: normalizeSocialHandleInput(input.tiktok),
    youtube: input.youtube || null,
    city: input.city || null,
    state: input.state || null,
    country: input.country || null,
    referredBy: input.referredBy || null,
    referralCode: input.referralCode ? input.referralCode.trim().toUpperCase() : null,
    claimedAgencyId: invitation ? invitation.agencyId : claimedMatch ? claimedMatch.existingAgency.id : null,
    claimedAgencyRole: invitation ? invitation.role : claimedMatch ? input.claimAgencyRole : null,
    claimRequestNote: !invitation && claimedMatch ? input.claimRequestNote || null : null,
    agencyInviteToken: invitation ? input.agencyInviteToken : null,
  };
  const application = await prisma.membershipApplication.create({ data: applicationData });

  // Re-validates server-side regardless of what the client already checked —
  // silently no-ops (no ReferralLink row) on an invalid/stale code rather
  // than blocking the application.
  if (input.referralCode?.trim()) {
    await createReferralLinkForApplication(
      organization.id,
      application.id,
      input.referralCode,
      input.referralSource ?? "MANUAL_ENTRY",
      input.email
    );
  }

  await recordApplicationLegalAcceptances(application.id, await buildAcceptanceInputsFromRequest(organization.id));

  await EmailService.sendApplicationReceivedEmail({
    to: application.email,
    fullName: application.fullName,
    organizationId: organization.id,
  });

  await logAudit({
    organizationId: organization.id,
    actorId: null,
    action: "application.submitted",
    entityType: "membership_application",
    entityId: application.id,
    after: { fullName: application.fullName, role: application.role },
  });

  // Notify every admin who can review applications — shows up in their
  // existing notification bell with zero UI changes needed there. Clicking
  // it opens the application's own review page, not just the list.
  const approvers = await prisma.member.findMany({
    where: { organizationId: organization.id, status: "ACTIVE" },
    select: { id: true, email: true, fullName: true, systemRole: true },
  });
  const approverRecipients = approvers.filter((m) => hasPermission(m.systemRole, "members.approve"));
  await notifyMembers(
    approverRecipients.map((m) => m.id),
    {
      type: "MEMBERSHIP_APPLICATION_RECEIVED",
      title: `New application: ${application.fullName}`,
      body: `${ROLE_LABELS[application.role]} · Submitted ${format(application.createdAt, "MMM d, h:mm a")}`,
      link: `/admin/applications/${application.id}`,
    }
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  for (const approver of approverRecipients) {
    await EmailService.sendNewMembershipApplicationAdminEmail({
      to: approver.email,
      fullName: approver.fullName,
      applicantName: application.fullName,
      applicantEmail: application.email,
      role: ROLE_LABELS[application.role],
      reviewUrl: `${appUrl}/admin/applications/${application.id}`,
      organizationId: organization.id,
      memberId: approver.id,
    });
  }

  return application;
}

export type ApplicationListFilters = {
  status?: MembershipApplicationStatus;
  search?: string;
  role?: MemberRole;
  sort?: "newest" | "role";
};

export function buildApplicationWhere(organizationId: string, filters: ApplicationListFilters): Prisma.MembershipApplicationWhereInput {
  return {
    organizationId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.search
      ? {
          OR: [
            { fullName: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { company: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function listApplications(organizationId: string, filters: ApplicationListFilters = {}) {
  const where = buildApplicationWhere(organizationId, filters);
  const orderBy: Prisma.MembershipApplicationOrderByWithRelationInput =
    filters.sort === "role" ? { role: "asc" } : { createdAt: "desc" };

  return prisma.membershipApplication.findMany({
    where,
    orderBy,
    include: {
      reviewedBy: { select: { id: true, fullName: true } },
      referralLink: { select: { referralCode: true } },
    },
  });
}

export async function getApplicationById(organizationId: string, id: string) {
  return prisma.membershipApplication.findFirst({
    where: { id, organizationId },
    include: {
      reviewedBy: { select: { id: true, fullName: true } },
      notesUpdatedBy: { select: { id: true, fullName: true } },
      // "Admins must be able to see whether an application was referred —
      // Referred By: [Name] / Code: [CODE], or Not Referred if none" — never
      // shown to the applicant, only surfaced here on the admin review page.
      referralLink: { select: { referralCode: true, referrer: { select: { fullName: true } } } },
      // Duplicate-resolution linkage — populated only when this application
      // was itself marked DUPLICATE (duplicateOf) or is the canonical
      // application another one was resolved against (duplicatesOfThis).
      duplicateOf: { select: { id: true, fullName: true, status: true } },
      duplicatesOfThis: { select: { id: true, fullName: true, status: true } },
      duplicateResolvedBy: { select: { id: true, fullName: true } },
    },
  });
}

const HISTORY_ACTIONS = ["application.submitted", "application.notes_updated", "application.approved", "application.rejected"];

/**
 * The application's timeline — reuses the AuditLog rows every mutation
 * already writes (submit/notes-update/approve/reject) rather than keeping a
 * separate history table. Actor names are batch-resolved the same way
 * listAuditLogs (features/admin/services/audit-log.service.ts) does.
 */
export async function getApplicationHistory(organizationId: string, applicationId: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      entityType: "membership_application",
      entityId: applicationId,
      action: { in: HISTORY_ACTIONS },
    },
    orderBy: { createdAt: "asc" },
  });

  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length
    ? await prisma.member.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true } })
    : [];
  const actorNames = new Map(actors.map((a) => [a.id, a.fullName]));

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    createdAt: log.createdAt,
    actorName: log.actorId ? (actorNames.get(log.actorId) ?? "Unknown member") : "Applicant",
  }));
}

export async function getApplicationCounts(organizationId: string) {
  const todayStart = startOfDay(new Date());

  const [pending, total, approvedToday, rejectedToday] = await Promise.all([
    prisma.membershipApplication.count({ where: { organizationId, status: "PENDING" } }),
    prisma.membershipApplication.count({ where: { organizationId } }),
    prisma.membershipApplication.count({
      where: { organizationId, status: "APPROVED", reviewedAt: { gte: todayStart } },
    }),
    prisma.membershipApplication.count({
      where: { organizationId, status: "REJECTED", reviewedAt: { gte: todayStart } },
    }),
  ]);

  return { pending, total, approvedToday, rejectedToday };
}
