import "server-only";

import type { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { EmailService } from "@/lib/email/email-service";
import { generateTempPassword } from "@/lib/security/temp-password";
import { hasPermission } from "@/lib/permissions";
import { ensureReferralCode } from "@/features/referrals/services/referral-code";
import { wasEmailAlreadySent } from "@/lib/email/idempotency";

/**
 * The account-provisioning half of "add a member" — QR badge, Supabase auth
 * account (temp password, never persisted), and the Welcome email. Shared by
 * createMember (admin adds a member directly) and approveApplicationAction
 * (admin approves a public application), so this logic exists in exactly
 * one place. Never blocks member creation itself: if SUPABASE_SERVICE_ROLE_KEY
 * isn't configured, or Supabase account creation fails, the Member row still
 * stands and the caller gets an onboardingNote to surface instead.
 */
export async function provisionMemberOnboarding(
  member: {
    id: string;
    organizationId: string;
    fullName: string;
    email: string;
    memberNumber: string;
    role: MemberRole;
  },
  options: {
    emailTemplate?: "welcome" | "application_approved";
    actorId?: string | null;
    /** "Existing Agency Claim Workflow" — set when this member's application
     * claimed an existing agency instead of registering a new one. "They do
     * not receive a new Agency ID," so the usual auto-mint here is skipped;
     * they'll inherit the claimed agency's code once that agency approves. */
    skipReferralCode?: boolean;
  } = {}
): Promise<{ onboardingNote?: string }> {
  const qrAsset = await ensureQRAsset({ type: "MEMBER", memberId: member.id });
  if (!options.skipReferralCode) {
    await ensureReferralCode(member.id, member.role);
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return {
      onboardingNote:
        'Member created. Automatic account setup and welcome email need SUPABASE_SERVICE_ROLE_KEY configured — use "Invite" to send login access manually for now.',
    };
  }

  const tempPassword = generateTempPassword();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: member.email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return {
      onboardingNote: `Member created, but automatic account setup failed (${authError?.message ?? "unknown error"}). Use "Invite" to send login access manually.`,
    };
  }

  await prisma.member.update({ where: { id: member.id }, data: { authUserId: authData.user.id } });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const emailArgs = {
    to: member.email,
    fullName: member.fullName,
    memberNumber: member.memberNumber,
    loginUrl: `${appUrl}/login`,
    tempPassword,
    qrCodeUrl: `${appUrl}/api/qr/${qrAsset.token}`,
    organizationId: member.organizationId,
    memberId: member.id,
    sentBy: options.actorId ?? null,
  };
  // Guards against a retried caller (e.g. approveApplicationAction re-run
  // after a partial failure) double-sending this specific email — reuses
  // EmailLog as the dedupe check rather than adding new state.
  const credentialsTemplate = options.emailTemplate === "application_approved" ? "application_approved" : "welcome";
  if (!(await wasEmailAlreadySent(member.organizationId, member.id, credentialsTemplate))) {
    if (credentialsTemplate === "application_approved") {
      await EmailService.sendApplicationApprovedEmail(emailArgs);
    } else {
      await EmailService.sendWelcomeEmail(emailArgs);
    }
  }

  if (member.role === "CREATOR") {
    const admins = await prisma.member.findMany({
      where: { organizationId: member.organizationId, status: "ACTIVE" },
      select: { id: true, email: true, fullName: true, systemRole: true },
    });
    for (const admin of admins.filter((a) => hasPermission(a.systemRole, "admin.access"))) {
      await EmailService.sendNewCreatorJoinedAdminEmail({
        to: admin.email,
        fullName: admin.fullName,
        creatorName: member.fullName,
        memberUrl: `${appUrl}/members/${member.id}`,
        organizationId: member.organizationId,
        memberId: admin.id,
      });
    }
  }

  return {};
}
