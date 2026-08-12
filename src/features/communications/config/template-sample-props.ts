import "server-only";

import type { TemplateName, TemplateProps } from "@/lib/email/email-types";

const now = () => new Date();
const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/**
 * Realistic placeholder data for every template — used to render a Preview
 * or send a Send Test Email from the Email Templates catalog page, since
 * neither action has a real recipient/context to pull props from. Server-side
 * only; not imported by any client component.
 */
export const TEMPLATE_SAMPLE_PROPS: { [K in TemplateName]: TemplateProps[K] } = {
  welcome: {
    fullName: "Alex Rivera",
    memberNumber: "CH-0142",
    loginUrl: "https://creatorhub360.com/login",
    tempPassword: "Temp-Pass-8821",
    qrCodeUrl: "https://creatorhub360.com/api/qr/sample-token",
  },
  password_reset: {
    fullName: "Alex Rivera",
    resetUrl: "https://creatorhub360.com/reset-password?token=sample",
  },
  verify_email: {
    fullName: "Alex Rivera",
    verifyUrl: "https://creatorhub360.com/verify-email?token=sample",
  },
  password_changed: {
    fullName: "Alex Rivera",
  },
  email_changed: {
    fullName: "Alex Rivera",
    newEmail: "alex.new@creatorhub360.com",
    confirmUrl: "https://creatorhub360.com/confirm-email?token=sample",
  },
  org_invitation: {
    roleLabel: "Admin",
    inviteUrl: "https://creatorhub360.com/invite/sample-token",
    expiresAt: inDays(7),
  },
  reservation_confirmed: {
    fullName: "Alex Rivera",
    spaceName: "Studio A",
    startTime: inDays(2),
    endTime: inDays(2),
    projectName: "Summer Capsule Shoot",
  },
  visitor_arrival: {
    recipientFullName: "Front Desk",
    visitorName: "Jordan Lee",
    visitorCompany: "Northwind Media",
    arrivedAt: now(),
  },
  commission_notification: {
    fullName: "Alex Rivera",
    amount: 250,
    projectName: "Summer Capsule Shoot",
    status: "paid",
  },
  membership_approved: {
    fullName: "Alex Rivera",
  },
  membership_denied: {
    fullName: "Alex Rivera",
    reason: "We're not able to approve this application at this time.",
    supportEmail: "support@creatorhub360.com",
  },
  announcement: {
    fullName: "Alex Rivera",
    subject: "Studio hours are changing next month",
    body: "Starting next month, the studio will be open until 9pm on weekdays. See you there!",
  },
  application_received: {
    fullName: "Alex Rivera",
  },
  application_approved: {
    fullName: "Alex Rivera",
    memberNumber: "CH-0142",
    loginUrl: "https://creatorhub360.com/login",
    tempPassword: "Temp-Pass-8821",
    qrCodeUrl: "https://creatorhub360.com/api/qr/sample-token",
  },
  application_rejected: {
    fullName: "Alex Rivera",
  },
  membership_activated: {
    fullName: "Alex Rivera",
    planName: "Creator Pro",
  },
  trial_ending_soon: {
    fullName: "Alex Rivera",
    planName: "Creator Pro",
    trialEndsAt: inDays(3),
  },
  subscription_renewal: {
    fullName: "Alex Rivera",
    planName: "Creator Pro",
    amount: 49,
    currentPeriodEnd: inDays(30),
  },
  payment_failed: {
    fullName: "Alex Rivera",
    planName: "Creator Pro",
    supportEmail: "support@creatorhub360.com",
  },
  new_like: {
    fullName: "Alex Rivera",
    likerName: "Jamie Chen",
    postTitle: "Behind the scenes: Summer Capsule Shoot",
    postUrl: "https://creatorhub360.com/community/collabs/sample-post",
  },
  new_comment: {
    fullName: "Alex Rivera",
    commenterName: "Jamie Chen",
    postTitle: "Behind the scenes: Summer Capsule Shoot",
    commentBody: "This turned out amazing, love the lighting!",
    postUrl: "https://creatorhub360.com/community/collabs/sample-post",
  },
  mention: {
    fullName: "Alex Rivera",
    mentionerName: "Jamie Chen",
    postTitle: "Behind the scenes: Summer Capsule Shoot",
    commentBody: "Great work on this @Alex Rivera!",
    postUrl: "https://creatorhub360.com/community/collabs/sample-post",
  },
  new_follower: {
    fullName: "Alex Rivera",
    followerName: "Jamie Chen",
    followerProfileUrl: "https://creatorhub360.com/profile/sample-member",
  },
  conversation_invitation: {
    fullName: "Alex Rivera",
    starterName: "Jamie Chen",
    isGroup: false,
    groupName: null,
    conversationUrl: "https://creatorhub360.com/messages/sample-conversation",
  },
  new_direct_message: {
    fullName: "Alex Rivera",
    senderName: "Jamie Chen",
    messagePreview: "Hey, are you free to shoot on Thursday?",
    conversationUrl: "https://creatorhub360.com/messages/sample-conversation",
  },
  new_group_message: {
    fullName: "Alex Rivera",
    senderName: "Jamie Chen",
    groupName: "Summer Capsule Team",
    messagePreview: "Call sheet is up, check the pinned message.",
    conversationUrl: "https://creatorhub360.com/messages/sample-conversation",
  },
  brand_invitation: {
    projectName: "Summer Capsule Shoot",
    roleLabel: "Brand Partner",
    inviteUrl: "https://creatorhub360.com/projects/invite/sample-token",
    expiresAt: inDays(7),
  },
  collaboration_request: {
    fullName: "Alex Rivera",
    requesterName: "Jamie Chen",
    projectName: "Summer Capsule Shoot",
    message: "I'd love to help out with styling on this one.",
    projectUrl: "https://creatorhub360.com/projects/sample-project",
  },
  project_approved: {
    fullName: "Alex Rivera",
    projectName: "Summer Capsule Shoot",
    projectUrl: "https://creatorhub360.com/projects/sample-project",
  },
  project_completed: {
    fullName: "Alex Rivera",
    projectName: "Summer Capsule Shoot",
    projectUrl: "https://creatorhub360.com/projects/sample-project",
  },
  reservation_reminder: {
    fullName: "Alex Rivera",
    spaceName: "Studio A",
    startTime: inDays(1),
    endTime: inDays(1),
  },
  reservation_cancelled: {
    fullName: "Alex Rivera",
    spaceName: "Studio A",
    startTime: inDays(2),
  },
  event_registration: {
    fullName: "Alex Rivera",
    eventTitle: "Creator Meetup: Fall Kickoff",
    startTime: inDays(14),
    location: "Main Lounge",
  },
  event_reminder: {
    fullName: "Alex Rivera",
    eventTitle: "Creator Meetup: Fall Kickoff",
    startTime: inDays(1),
    location: "Main Lounge",
  },
  event_starting_soon: {
    fullName: "Alex Rivera",
    eventTitle: "Creator Meetup: Fall Kickoff",
    startTime: inDays(0),
    location: "Main Lounge",
  },
  event_approved: {
    fullName: "Alex Rivera",
    eventTitle: "Creator Meetup: Fall Kickoff",
    startTime: inDays(7),
    eventUrl: "https://app.creatorhub360.com/events/sample",
  },
  event_rejected: {
    fullName: "Alex Rivera",
    eventTitle: "Creator Meetup: Fall Kickoff",
    reason: "This conflicts with another event already booked in that space.",
  },
  event_changes_requested: {
    fullName: "Alex Rivera",
    eventTitle: "Creator Meetup: Fall Kickoff",
    note: "Please add a capacity limit and confirm catering details.",
    editUrl: "https://app.creatorhub360.com/events/proposals/sample",
  },
  event_cancelled: {
    fullName: "Alex Rivera",
    eventTitle: "Creator Meetup: Fall Kickoff",
    startTime: inDays(7),
    reason: "Venue became unavailable.",
  },
  new_membership_application_admin: {
    fullName: "Jordan Admin",
    applicantName: "Alex Rivera",
    applicantEmail: "alex@creatorhub360.com",
    role: "Photographer",
    reviewUrl: "https://creatorhub360.com/admin/applications/sample-id",
  },
  new_creator_joined_admin: {
    fullName: "Jordan Admin",
    creatorName: "Alex Rivera",
    memberUrl: "https://creatorhub360.com/members/sample-id",
  },
  daily_admin_summary: {
    fullName: "Jordan Admin",
    date: now(),
    stats: {
      newApplicationsToday: 3,
      newCreatorsToday: 2,
      pendingApplications: 5,
      totalMembers: 128,
    },
    dashboardUrl: "https://creatorhub360.com/dashboard",
  },
  critical_system_alert: {
    fullName: "Jordan Admin",
    template: "password_reset",
    recipient: "someone@example.com",
    reason: "Resend API returned a 5xx error after 3 attempts",
  },
  legal_document_updated: {
    fullName: "Alex Rivera",
    documentTitle: "Terms & Conditions",
    version: "2.0",
    effectiveDate: inDays(0).toISOString(),
    reviewUrl: "https://creatorhub360.com/legal/terms",
    reacceptUrl: "https://creatorhub360.com/legal/reaccept",
  },
  agency_request_received: {
    fullName: "Influence Management Group",
    creatorName: "Jamie Creator",
    reviewUrl: "https://creatorhub360.com/agency",
  },
  agency_request_approved: {
    fullName: "Jamie Creator",
    agencyName: "Influence Management Group",
  },
  agency_request_rejected: {
    fullName: "Jamie Creator",
    agencyName: "Influence Management Group",
  },
  agency_access_requested: {
    fullName: "Influence Management Group",
    requesterName: "Taylor Manager",
    reviewUrl: "https://creatorhub360.com/agency",
  },
  agency_access_approved: {
    fullName: "Taylor Manager",
    agencyName: "Influence Management Group",
  },
  agency_access_rejected: {
    fullName: "Taylor Manager",
    agencyName: "Influence Management Group",
  },
  agency_team_activity: {
    fullName: "Jordan Owner",
    headline: "Sarah accepted your invitation",
    body: "Sarah Manager is now part of Influence Management Group as a Manager.",
    ctaUrl: "https://creatorhub360.com/agency/team",
    ctaLabel: "View Team",
  },
};
