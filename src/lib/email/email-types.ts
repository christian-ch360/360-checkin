import "server-only";

import type { ReactElement } from "react";
import { render } from "@react-email/render";

import { WelcomeEmail, type WelcomeEmailProps } from "@/emails/templates/auth/welcome-email";
import { PasswordResetEmail, type PasswordResetEmailProps } from "@/emails/templates/auth/password-reset-email";
import { VerifyEmailEmail, type VerifyEmailEmailProps } from "@/emails/templates/auth/verify-email-email";
import { PasswordChangedEmail, type PasswordChangedEmailProps } from "@/emails/templates/auth/password-changed-email";
import { EmailChangedEmail, type EmailChangedEmailProps } from "@/emails/templates/auth/email-changed-email";
import { OrgInvitationEmail, type OrgInvitationEmailProps } from "@/emails/templates/admin/org-invitation-email";
import {
  ReservationConfirmedEmail,
  type ReservationConfirmedEmailProps,
} from "@/emails/templates/spaces/reservation-confirmed-email";
import { VisitorArrivalEmail, type VisitorArrivalEmailProps } from "@/emails/templates/misc/visitor-arrival-email";
import {
  CommissionNotificationEmail,
  type CommissionNotificationEmailProps,
} from "@/emails/templates/misc/commission-notification-email";
import {
  MembershipApprovedEmail,
  type MembershipApprovedEmailProps,
} from "@/emails/templates/membership/membership-approved-email";
import {
  MembershipDeniedEmail,
  type MembershipDeniedEmailProps,
} from "@/emails/templates/membership/membership-denied-email";
import { AnnouncementEmail, type AnnouncementEmailProps } from "@/emails/templates/misc/announcement-email";
import {
  ApplicationReceivedEmail,
  type ApplicationReceivedEmailProps,
} from "@/emails/templates/membership/application-received-email";
import {
  ApplicationRejectedEmail,
  type ApplicationRejectedEmailProps,
} from "@/emails/templates/membership/application-rejected-email";
import {
  MembershipActivatedEmail,
  type MembershipActivatedEmailProps,
} from "@/emails/templates/membership/membership-activated-email";
import {
  TrialEndingSoonEmail,
  type TrialEndingSoonEmailProps,
} from "@/emails/templates/membership/trial-ending-soon-email";
import {
  SubscriptionRenewalEmail,
  type SubscriptionRenewalEmailProps,
} from "@/emails/templates/membership/subscription-renewal-email";
import { PaymentFailedEmail, type PaymentFailedEmailProps } from "@/emails/templates/membership/payment-failed-email";
import { NewLikeEmail, type NewLikeEmailProps } from "@/emails/templates/community/new-like-email";
import { NewCommentEmail, type NewCommentEmailProps } from "@/emails/templates/community/new-comment-email";
import { MentionEmail, type MentionEmailProps } from "@/emails/templates/community/mention-email";
import { NewFollowerEmail, type NewFollowerEmailProps } from "@/emails/templates/community/new-follower-email";
import {
  ConversationInvitationEmail,
  type ConversationInvitationEmailProps,
} from "@/emails/templates/messaging/conversation-invitation-email";
import {
  NewDirectMessageEmail,
  type NewDirectMessageEmailProps,
} from "@/emails/templates/messaging/new-direct-message-email";
import { NewGroupMessageEmail, type NewGroupMessageEmailProps } from "@/emails/templates/messaging/new-group-message-email";
import { BrandInvitationEmail, type BrandInvitationEmailProps } from "@/emails/templates/projects/brand-invitation-email";
import {
  CollaborationRequestEmail,
  type CollaborationRequestEmailProps,
} from "@/emails/templates/projects/collaboration-request-email";
import { ProjectApprovedEmail, type ProjectApprovedEmailProps } from "@/emails/templates/projects/project-approved-email";
import { ProjectCompletedEmail, type ProjectCompletedEmailProps } from "@/emails/templates/projects/project-completed-email";
import {
  ReservationReminderEmail,
  type ReservationReminderEmailProps,
} from "@/emails/templates/spaces/reservation-reminder-email";
import {
  ReservationCancelledEmail,
  type ReservationCancelledEmailProps,
} from "@/emails/templates/spaces/reservation-cancelled-email";
import {
  EventRegistrationEmail,
  type EventRegistrationEmailProps,
} from "@/emails/templates/events/event-registration-email";
import { EventReminderEmail, type EventReminderEmailProps } from "@/emails/templates/events/event-reminder-email";
import {
  EventStartingSoonEmail,
  type EventStartingSoonEmailProps,
} from "@/emails/templates/events/event-starting-soon-email";
import { EventApprovedEmail, type EventApprovedEmailProps } from "@/emails/templates/events/event-approved-email";
import { EventRejectedEmail, type EventRejectedEmailProps } from "@/emails/templates/events/event-rejected-email";
import {
  EventChangesRequestedEmail,
  type EventChangesRequestedEmailProps,
} from "@/emails/templates/events/event-changes-requested-email";
import { EventCancelledEmail, type EventCancelledEmailProps } from "@/emails/templates/events/event-cancelled-email";
import {
  NewMembershipApplicationAdminEmail,
  type NewMembershipApplicationAdminEmailProps,
} from "@/emails/templates/admin/new-membership-application-admin-email";
import {
  NewCreatorJoinedAdminEmail,
  type NewCreatorJoinedAdminEmailProps,
} from "@/emails/templates/admin/new-creator-joined-admin-email";
import {
  DailyAdminSummaryEmail,
  type DailyAdminSummaryEmailProps,
} from "@/emails/templates/admin/daily-admin-summary-email";
import {
  CriticalSystemAlertEmail,
  type CriticalSystemAlertEmailProps,
} from "@/emails/templates/admin/critical-system-alert-email";
import {
  LegalDocumentUpdatedEmail,
  type LegalDocumentUpdatedEmailProps,
} from "@/emails/templates/admin/legal-document-updated-email";
import {
  AgencyRequestReceivedEmail,
  type AgencyRequestReceivedEmailProps,
} from "@/emails/templates/admin/agency-request-received-email";
import {
  AgencyRequestApprovedEmail,
  type AgencyRequestApprovedEmailProps,
} from "@/emails/templates/membership/agency-request-approved-email";
import {
  AgencyRequestRejectedEmail,
  type AgencyRequestRejectedEmailProps,
} from "@/emails/templates/membership/agency-request-rejected-email";
import {
  AgencyAccessRequestedEmail,
  type AgencyAccessRequestedEmailProps,
} from "@/emails/templates/admin/agency-access-requested-email";
import {
  AgencyAccessApprovedEmail,
  type AgencyAccessApprovedEmailProps,
} from "@/emails/templates/membership/agency-access-approved-email";
import {
  AgencyAccessRejectedEmail,
  type AgencyAccessRejectedEmailProps,
} from "@/emails/templates/membership/agency-access-rejected-email";
import {
  AgencyTeamActivityEmail,
  type AgencyTeamActivityEmailProps,
} from "@/emails/templates/admin/agency-team-activity-email";

/**
 * Every template registered here gets a matching EmailService method (see
 * email-service.ts). New email categories are added by (1) writing the
 * template component, (2) adding one entry to TemplateProps + TEMPLATES,
 * (3) adding one sendXEmail method — nothing else in the send pipeline
 * changes.
 */
export type TemplateProps = {
  welcome: WelcomeEmailProps;
  password_reset: PasswordResetEmailProps;
  verify_email: VerifyEmailEmailProps;
  password_changed: PasswordChangedEmailProps;
  email_changed: EmailChangedEmailProps;
  org_invitation: OrgInvitationEmailProps;
  reservation_confirmed: ReservationConfirmedEmailProps;
  visitor_arrival: VisitorArrivalEmailProps;
  commission_notification: CommissionNotificationEmailProps;
  membership_approved: MembershipApprovedEmailProps;
  membership_denied: MembershipDeniedEmailProps;
  announcement: AnnouncementEmailProps;
  application_received: ApplicationReceivedEmailProps;
  // Reuses WelcomeEmail's exact props/content (Member ID, QR, login, temp
  // password) — same onboarding email, different subject line for the
  // application-approval trigger point. See provisionMemberOnboarding.
  application_approved: WelcomeEmailProps;
  application_rejected: ApplicationRejectedEmailProps;
  membership_activated: MembershipActivatedEmailProps;
  trial_ending_soon: TrialEndingSoonEmailProps;
  subscription_renewal: SubscriptionRenewalEmailProps;
  payment_failed: PaymentFailedEmailProps;
  new_like: NewLikeEmailProps;
  new_comment: NewCommentEmailProps;
  mention: MentionEmailProps;
  new_follower: NewFollowerEmailProps;
  conversation_invitation: ConversationInvitationEmailProps;
  new_direct_message: NewDirectMessageEmailProps;
  new_group_message: NewGroupMessageEmailProps;
  brand_invitation: BrandInvitationEmailProps;
  collaboration_request: CollaborationRequestEmailProps;
  project_approved: ProjectApprovedEmailProps;
  project_completed: ProjectCompletedEmailProps;
  reservation_reminder: ReservationReminderEmailProps;
  reservation_cancelled: ReservationCancelledEmailProps;
  event_registration: EventRegistrationEmailProps;
  event_reminder: EventReminderEmailProps;
  event_starting_soon: EventStartingSoonEmailProps;
  event_approved: EventApprovedEmailProps;
  event_rejected: EventRejectedEmailProps;
  event_changes_requested: EventChangesRequestedEmailProps;
  event_cancelled: EventCancelledEmailProps;
  new_membership_application_admin: NewMembershipApplicationAdminEmailProps;
  new_creator_joined_admin: NewCreatorJoinedAdminEmailProps;
  daily_admin_summary: DailyAdminSummaryEmailProps;
  critical_system_alert: CriticalSystemAlertEmailProps;
  legal_document_updated: LegalDocumentUpdatedEmailProps;
  agency_request_received: AgencyRequestReceivedEmailProps;
  agency_request_approved: AgencyRequestApprovedEmailProps;
  agency_request_rejected: AgencyRequestRejectedEmailProps;
  agency_access_requested: AgencyAccessRequestedEmailProps;
  agency_access_approved: AgencyAccessApprovedEmailProps;
  agency_access_rejected: AgencyAccessRejectedEmailProps;
  agency_team_activity: AgencyTeamActivityEmailProps;
};

export type TemplateName = keyof TemplateProps;

type TemplateDef<K extends TemplateName> = {
  component: (props: TemplateProps[K]) => ReactElement;
  subject: (props: TemplateProps[K]) => string;
};

export const TEMPLATES: { [K in TemplateName]: TemplateDef<K> } = {
  welcome: { component: WelcomeEmail, subject: () => "Welcome to CreatorHub360" },
  password_reset: { component: PasswordResetEmail, subject: () => "Reset your CreatorHub360 password" },
  verify_email: { component: VerifyEmailEmail, subject: () => "Verify your CreatorHub360 email address" },
  password_changed: { component: PasswordChangedEmail, subject: () => "Your CreatorHub360 password was changed" },
  email_changed: { component: EmailChangedEmail, subject: () => "Confirm your new CreatorHub360 email address" },
  org_invitation: { component: OrgInvitationEmail, subject: () => "You're invited to CreatorHub360" },
  reservation_confirmed: {
    component: ReservationConfirmedEmail,
    subject: (p) => `Booking confirmed: ${p.spaceName}`,
  },
  visitor_arrival: { component: VisitorArrivalEmail, subject: (p) => `${p.visitorName} has arrived` },
  commission_notification: {
    component: CommissionNotificationEmail,
    subject: (p) => (p.status === "paid" ? "Commission paid" : "Commission earned"),
  },
  membership_approved: { component: MembershipApprovedEmail, subject: () => "Welcome to CreatorHub360 🎉" },
  membership_denied: { component: MembershipDeniedEmail, subject: () => "Application Update" },
  announcement: { component: AnnouncementEmail, subject: (p) => p.subject },
  application_received: {
    component: ApplicationReceivedEmail,
    subject: () => "We've received your CreatorHub360 application",
  },
  application_approved: { component: WelcomeEmail, subject: () => "Welcome to CreatorHub360 🎉" },
  application_rejected: { component: ApplicationRejectedEmail, subject: () => "Your CreatorHub360 Application" },
  membership_activated: {
    component: MembershipActivatedEmail,
    subject: () => "Your CreatorHub360 membership is now active",
  },
  trial_ending_soon: { component: TrialEndingSoonEmail, subject: () => "Your CreatorHub360 trial is ending soon" },
  subscription_renewal: {
    component: SubscriptionRenewalEmail,
    subject: () => "Your CreatorHub360 membership has renewed",
  },
  payment_failed: { component: PaymentFailedEmail, subject: () => "We couldn't process your CreatorHub360 payment" },
  new_like: { component: NewLikeEmail, subject: (p) => `${p.likerName} liked your post` },
  new_comment: { component: NewCommentEmail, subject: (p) => `${p.commenterName} commented on your post` },
  mention: { component: MentionEmail, subject: (p) => `${p.mentionerName} mentioned you` },
  new_follower: { component: NewFollowerEmail, subject: (p) => `${p.followerName} started following you` },
  conversation_invitation: {
    component: ConversationInvitationEmail,
    subject: (p) => (p.isGroup ? `${p.starterName} added you to a group chat` : `${p.starterName} started a conversation with you`),
  },
  new_direct_message: { component: NewDirectMessageEmail, subject: (p) => `New message from ${p.senderName}` },
  new_group_message: { component: NewGroupMessageEmail, subject: (p) => `New message in ${p.groupName}` },
  brand_invitation: {
    component: BrandInvitationEmail,
    subject: (p) => `You're invited to collaborate on ${p.projectName}`,
  },
  collaboration_request: {
    component: CollaborationRequestEmail,
    subject: (p) => `${p.requesterName} wants to join ${p.projectName}`,
  },
  project_approved: { component: ProjectApprovedEmail, subject: (p) => `${p.projectName} is now active` },
  project_completed: { component: ProjectCompletedEmail, subject: (p) => `${p.projectName} is complete` },
  reservation_reminder: {
    component: ReservationReminderEmail,
    subject: (p) => `Reminder: ${p.spaceName} coming up soon`,
  },
  reservation_cancelled: {
    component: ReservationCancelledEmail,
    subject: (p) => `Your ${p.spaceName} booking was cancelled`,
  },
  event_registration: { component: EventRegistrationEmail, subject: (p) => `You're registered for ${p.eventTitle}` },
  event_reminder: { component: EventReminderEmail, subject: (p) => `${p.eventTitle} is coming up` },
  event_starting_soon: { component: EventStartingSoonEmail, subject: (p) => `${p.eventTitle} is starting soon` },
  event_approved: { component: EventApprovedEmail, subject: (p) => `${p.eventTitle} was approved` },
  event_rejected: { component: EventRejectedEmail, subject: () => "Your event proposal was declined" },
  event_changes_requested: { component: EventChangesRequestedEmail, subject: (p) => `Changes requested for ${p.eventTitle}` },
  event_cancelled: { component: EventCancelledEmail, subject: (p) => `${p.eventTitle} was cancelled` },
  new_membership_application_admin: {
    component: NewMembershipApplicationAdminEmail,
    subject: (p) => `New application from ${p.applicantName}`,
  },
  new_creator_joined_admin: {
    component: NewCreatorJoinedAdminEmail,
    subject: (p) => `${p.creatorName} just joined`,
  },
  daily_admin_summary: {
    component: DailyAdminSummaryEmail,
    subject: (p) => `Your CreatorHub360 daily summary for ${p.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
  },
  critical_system_alert: { component: CriticalSystemAlertEmail, subject: () => "Critical email delivery failure" },
  legal_document_updated: {
    component: LegalDocumentUpdatedEmail,
    subject: (p) => `${p.documentTitle} updated to v${p.version} — action required`,
  },
  agency_request_received: {
    component: AgencyRequestReceivedEmail,
    subject: (p) => `New creator request: ${p.creatorName}`,
  },
  agency_request_approved: {
    component: AgencyRequestApprovedEmail,
    subject: (p) => `You're now connected to ${p.agencyName}`,
  },
  agency_request_rejected: {
    component: AgencyRequestRejectedEmail,
    subject: () => "Your agency request was declined",
  },
  agency_access_requested: {
    component: AgencyAccessRequestedEmail,
    subject: (p) => `${p.requesterName} wants to join your agency`,
  },
  agency_access_approved: {
    component: AgencyAccessApprovedEmail,
    subject: (p) => `You're now part of ${p.agencyName}`,
  },
  agency_access_rejected: {
    component: AgencyAccessRejectedEmail,
    subject: () => "Your agency access request was declined",
  },
  agency_team_activity: {
    component: AgencyTeamActivityEmail,
    subject: (p) => p.headline,
  },
};

/** Renders a template to its subject/html/text — the pure half of a send, reused by EmailService and any future preview tooling. */
export async function renderTemplate<K extends TemplateName>(
  template: K,
  props: TemplateProps[K]
): Promise<{ subject: string; html: string; text: string }> {
  const def = TEMPLATES[template];
  const subject = def.subject(props);
  const element = def.component(props);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject, html, text };
}
