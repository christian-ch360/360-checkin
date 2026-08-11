import type { AgencyMemberRole } from "@prisma/client";

/**
 * Pure permission matrix for Agency Team Management — no "server-only" tag
 * (mirrors lib/permissions/member-rules.ts's shape) so the exact same
 * functions can gate both the UI (hide/disable a control) and the server
 * action underneath it, guaranteeing they never disagree.
 *
 * All of this is deliberately keyed off AgencyMemberRole alone, never a
 * hardcoded "AGENCY" check — see the "Generic Organization Architecture"
 * note in agency-team.service.ts for why that's what makes this reusable
 * for future Brand/Broker/Business Development/Entertainment/Vendor teams.
 *
 * Agency CRM additions (Campaigns/Contracts/Invoices/Files/Tasks) follow the
 * spec's tiering: Owner/Admin get full CRUD everywhere; Manager can create/
 * edit campaigns and tasks and view (not manage) contracts/invoices; Staff
 * is read-only. "Creator" and "Brand Contact" aren't AgencyMemberRole values
 * at all — they're self-scoped checks below, called with already-fetched
 * data (e.g. a campaign's creator-id list) to keep this file pure.
 */

export function canApproveCreatorRequests(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

export function canViewAnalytics(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER" || role === "STAFF";
}

export function canEditAgencyProfile(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

export function canManageIntegrations(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canTransferOwnership(role: AgencyMemberRole | null): boolean {
  return role === "OWNER";
}

/** Owner can invite any role; Admin can invite Admin/Manager/Staff but never Owner; Manager can invite Manager/Staff; Staff can't invite. */
export function canInviteRole(actorRole: AgencyMemberRole | null, targetRole: AgencyMemberRole): boolean {
  if (actorRole === "OWNER") return true;
  if (actorRole === "ADMIN") return targetRole !== "OWNER";
  if (actorRole === "MANAGER") return targetRole === "MANAGER" || targetRole === "STAFF";
  return false;
}

/** Governs remove / promote / demote of an existing team member. Owner has full authority over
 * anyone (subject to the last-owner guard elsewhere); Admin can manage Admin/Manager/Staff but
 * never an Owner; Manager can manage Manager/Staff; Staff can't manage anyone. */
export function canManageTeamMember(actorRole: AgencyMemberRole | null, targetRole: AgencyMemberRole): boolean {
  if (actorRole === "OWNER") return true;
  if (actorRole === "ADMIN") return targetRole !== "OWNER";
  if (actorRole === "MANAGER") return targetRole === "MANAGER" || targetRole === "STAFF";
  return false;
}

// =============================================================================
// Agency CRM — Campaigns, Contracts, Invoices, Files, Tasks
// =============================================================================

/** Create/edit a campaign, or add/remove its creators and deliverables. */
export function canManageCampaigns(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

export function canDeleteCampaign(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Moving a campaign from PENDING_APPROVAL to ACTIVE (or rejecting it). */
export function canApproveCampaign(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Create/edit/send a contract or upload a new version — Manager can view but not manage. */
export function canManageContracts(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canDeleteContract(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Create/edit/mark-paid an invoice — Manager can view but not manage. */
export function canManageInvoices(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Upload files, create/rename/move folders. */
export function canManageFiles(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

/** Create/edit an agency task (priority, assignee, due date). */
export function canManageTasks(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

export function canDeleteTask(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

// =============================================================================
// Self-scoped checks for the two non-staff roles — "Creator" and "Brand
// Contact" aren't AgencyMemberRole values; a Creator is any Member.role =
// CREATOR connected via the existing agencyId self-relation, a Brand Contact
// is any Member.role = BRAND connected via brandId. Both take already-
// fetched data so this file stays a pure function library — callers do the
// query, these just decide.
// =============================================================================

/** A connected creator can only see campaigns they're actually assigned to. */
export function canCreatorViewCampaign(creatorMemberId: string, campaignCreatorIds: string[]): boolean {
  return campaignCreatorIds.includes(creatorMemberId);
}

/** A Brand Contact can only see campaigns/contracts/invoices for their own brand. */
export function canBrandContactViewCampaign(memberBrandId: string | null, campaignBrandId: string): boolean {
  return memberBrandId !== null && memberBrandId === campaignBrandId;
}

/** A Brand Contact's one write action: approving/rejecting a submitted deliverable for their brand. */
export function canBrandContactReviewDeliverable(memberBrandId: string | null, campaignBrandId: string): boolean {
  return canBrandContactViewCampaign(memberBrandId, campaignBrandId);
}
