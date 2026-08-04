import "server-only";

import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit-log";
import { sendEmailWithRetry, type SendEmailResult } from "@/lib/email/send-email";
import { getEmailFrom } from "@/lib/email/resend";
import { renderTemplate, type TemplateName, type TemplateProps } from "@/lib/email/email-types";
import { TEMPLATE_CATEGORY } from "@/features/communications/config/template-catalog";

type SendArgs<K extends TemplateName> = {
  to: string;
  organizationId: string;
  memberId?: string | null;
  /** The Member id of the human admin who triggered this send, if any — left unset for automated/system-triggered sends, which then display as "System" in the Email Center. Never set for notifications *to* an admin. */
  sentBy?: string | null;
  /** "critical" fires sendCriticalSystemAlertEmail to org admins if every retry fails — reserved for auth/billing-critical sends. */
  priority?: "normal" | "critical";
} & TemplateProps[K];

/**
 * Renders the template, writes one EmailLog row, sends with retry, and
 * updates that same row with the final outcome. Every EmailService method
 * funnels through here — no feature calls Resend or renders a template
 * directly.
 */
async function sendTemplatedEmail<K extends TemplateName>(template: K, args: SendArgs<K>): Promise<SendEmailResult> {
  const { to, organizationId, memberId, sentBy, priority, ...props } = args;
  const { subject, html, text } = await renderTemplate(template, props as unknown as TemplateProps[K]);
  const from = getEmailFrom();
  // Opportunistic — the overwhelming majority of templates take a `fullName`
  // prop for the recipient; templates that don't (e.g. org_invitation,
  // brand_invitation) simply leave this null and the UI falls back to the
  // linked Member's name.
  const recipientName =
    typeof (props as Record<string, unknown>).fullName === "string"
      ? (props as Record<string, string>).fullName
      : null;

  const log = await prisma.emailLog.create({
    data: {
      organizationId,
      to,
      recipientName,
      subject,
      template,
      category: TEMPLATE_CATEGORY[template],
      status: "QUEUED",
      from,
      html,
      text,
      memberId: memberId ?? null,
      sentById: sentBy ?? null,
    },
  });

  const result = await sendEmailWithRetry({ to, subject, html, text });
  const now = new Date();

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      status: result.sent ? "SENT" : "FAILED",
      providerId: result.providerId ?? null,
      error: result.sent ? null : (result.reason ?? null),
      attempts: result.attempts,
      deliveredAt: result.sent ? now : null,
      failedAt: result.sent ? null : now,
    },
  });

  // Failed/not-configured attempts stay in EmailLog only (that's the
  // delivery-status record); the audit trail is for emails that actually
  // went out.
  if (result.sent) {
    await logAudit({
      organizationId,
      actorId: null,
      action: "email.sent",
      entityType: "email_log",
      entityId: log.id,
      after: { template, to, subject, recipientMemberId: memberId ?? null },
    });
  } else if (priority === "critical" && template !== "critical_system_alert") {
    await fireCriticalAlert(organizationId, template, to, result.reason ?? "unknown");
  }

  return result;
}

/**
 * Narrowly scoped, not a general error-monitoring system — only fires when
 * a call explicitly marked priority: "critical" exhausts every retry.
 */
async function fireCriticalAlert(organizationId: string, template: string, recipient: string, reason: string) {
  const admins = await prisma.member.findMany({
    where: { organizationId, systemRole: { in: ["ADMIN", "SUPER_ADMIN"] }, deletedAt: null },
    select: { id: true, email: true, fullName: true },
  });
  for (const admin of admins) {
    await sendTemplatedEmail("critical_system_alert", {
      to: admin.email,
      fullName: admin.fullName,
      template,
      recipient,
      reason,
      organizationId,
      memberId: admin.id,
    });
  }
}

export const EmailService = {
  sendWelcomeEmail: (args: SendArgs<"welcome">) => sendTemplatedEmail("welcome", args),
  sendPasswordResetEmail: (args: SendArgs<"password_reset">) => sendTemplatedEmail("password_reset", args),
  sendVerifyEmailEmail: (args: SendArgs<"verify_email">) => sendTemplatedEmail("verify_email", args),
  sendPasswordChangedEmail: (args: SendArgs<"password_changed">) => sendTemplatedEmail("password_changed", args),
  sendEmailChangedEmail: (args: SendArgs<"email_changed">) => sendTemplatedEmail("email_changed", args),
  sendOrgInvitationEmail: (args: SendArgs<"org_invitation">) => sendTemplatedEmail("org_invitation", args),
  sendReservationConfirmation: (args: SendArgs<"reservation_confirmed">) =>
    sendTemplatedEmail("reservation_confirmed", args),
  sendVisitorArrivalEmail: (args: SendArgs<"visitor_arrival">) => sendTemplatedEmail("visitor_arrival", args),
  sendCommissionNotificationEmail: (args: SendArgs<"commission_notification">) =>
    sendTemplatedEmail("commission_notification", args),
  sendMembershipApprovedEmail: (args: SendArgs<"membership_approved">) =>
    sendTemplatedEmail("membership_approved", args),
  sendMembershipDeniedEmail: (args: SendArgs<"membership_denied">) => sendTemplatedEmail("membership_denied", args),
  sendAnnouncementEmail: (args: SendArgs<"announcement">) => sendTemplatedEmail("announcement", args),
  sendApplicationReceivedEmail: (args: SendArgs<"application_received">) =>
    sendTemplatedEmail("application_received", args),
  sendApplicationApprovedEmail: (args: SendArgs<"application_approved">) =>
    sendTemplatedEmail("application_approved", args),
  sendApplicationRejectedEmail: (args: SendArgs<"application_rejected">) =>
    sendTemplatedEmail("application_rejected", args),
  sendMembershipActivatedEmail: (args: SendArgs<"membership_activated">) =>
    sendTemplatedEmail("membership_activated", args),
  sendTrialEndingSoonEmail: (args: SendArgs<"trial_ending_soon">) => sendTemplatedEmail("trial_ending_soon", args),
  sendSubscriptionRenewalEmail: (args: SendArgs<"subscription_renewal">) =>
    sendTemplatedEmail("subscription_renewal", args),
  sendPaymentFailedEmail: (args: SendArgs<"payment_failed">) => sendTemplatedEmail("payment_failed", args),
  sendNewLikeEmail: (args: SendArgs<"new_like">) => sendTemplatedEmail("new_like", args),
  sendNewCommentEmail: (args: SendArgs<"new_comment">) => sendTemplatedEmail("new_comment", args),
  sendMentionEmail: (args: SendArgs<"mention">) => sendTemplatedEmail("mention", args),
  sendNewFollowerEmail: (args: SendArgs<"new_follower">) => sendTemplatedEmail("new_follower", args),
  sendConversationInvitationEmail: (args: SendArgs<"conversation_invitation">) =>
    sendTemplatedEmail("conversation_invitation", args),
  sendNewDirectMessageEmail: (args: SendArgs<"new_direct_message">) => sendTemplatedEmail("new_direct_message", args),
  sendNewGroupMessageEmail: (args: SendArgs<"new_group_message">) => sendTemplatedEmail("new_group_message", args),
  sendBrandInvitationEmail: (args: SendArgs<"brand_invitation">) => sendTemplatedEmail("brand_invitation", args),
  sendCollaborationRequestEmail: (args: SendArgs<"collaboration_request">) =>
    sendTemplatedEmail("collaboration_request", args),
  sendProjectApprovedEmail: (args: SendArgs<"project_approved">) => sendTemplatedEmail("project_approved", args),
  sendProjectCompletedEmail: (args: SendArgs<"project_completed">) => sendTemplatedEmail("project_completed", args),
  sendReservationReminderEmail: (args: SendArgs<"reservation_reminder">) =>
    sendTemplatedEmail("reservation_reminder", args),
  sendReservationCancelledEmail: (args: SendArgs<"reservation_cancelled">) =>
    sendTemplatedEmail("reservation_cancelled", args),
  sendEventRegistrationEmail: (args: SendArgs<"event_registration">) =>
    sendTemplatedEmail("event_registration", args),
  sendEventReminderEmail: (args: SendArgs<"event_reminder">) => sendTemplatedEmail("event_reminder", args),
  sendEventStartingSoonEmail: (args: SendArgs<"event_starting_soon">) =>
    sendTemplatedEmail("event_starting_soon", args),
  sendEventApprovedEmail: (args: SendArgs<"event_approved">) => sendTemplatedEmail("event_approved", args),
  sendEventRejectedEmail: (args: SendArgs<"event_rejected">) => sendTemplatedEmail("event_rejected", args),
  sendEventChangesRequestedEmail: (args: SendArgs<"event_changes_requested">) =>
    sendTemplatedEmail("event_changes_requested", args),
  sendEventCancelledEmail: (args: SendArgs<"event_cancelled">) => sendTemplatedEmail("event_cancelled", args),
  sendNewMembershipApplicationAdminEmail: (args: SendArgs<"new_membership_application_admin">) =>
    sendTemplatedEmail("new_membership_application_admin", args),
  sendNewCreatorJoinedAdminEmail: (args: SendArgs<"new_creator_joined_admin">) =>
    sendTemplatedEmail("new_creator_joined_admin", args),
  sendAdminSummary: (args: SendArgs<"daily_admin_summary">) => sendTemplatedEmail("daily_admin_summary", args),
  sendCriticalSystemAlertEmail: (args: SendArgs<"critical_system_alert">) =>
    sendTemplatedEmail("critical_system_alert", args),
  sendLegalDocumentUpdatedEmail: (args: SendArgs<"legal_document_updated">) =>
    sendTemplatedEmail("legal_document_updated", args),
  sendAgencyRequestReceivedEmail: (args: SendArgs<"agency_request_received">) =>
    sendTemplatedEmail("agency_request_received", args),
  sendAgencyRequestApprovedEmail: (args: SendArgs<"agency_request_approved">) =>
    sendTemplatedEmail("agency_request_approved", args),
  sendAgencyRequestRejectedEmail: (args: SendArgs<"agency_request_rejected">) =>
    sendTemplatedEmail("agency_request_rejected", args),
  sendAgencyAccessRequestedEmail: (args: SendArgs<"agency_access_requested">) =>
    sendTemplatedEmail("agency_access_requested", args),
  sendAgencyAccessApprovedEmail: (args: SendArgs<"agency_access_approved">) =>
    sendTemplatedEmail("agency_access_approved", args),
  sendAgencyAccessRejectedEmail: (args: SendArgs<"agency_access_rejected">) =>
    sendTemplatedEmail("agency_access_rejected", args),
  sendAgencyTeamActivityEmail: (args: SendArgs<"agency_team_activity">) =>
    sendTemplatedEmail("agency_team_activity", args),
};
