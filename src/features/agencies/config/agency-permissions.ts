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
 */

export function canApproveCreatorRequests(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "MANAGER";
}

export function canViewAnalytics(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "MANAGER" || role === "STAFF";
}

export function canEditAgencyProfile(role: AgencyMemberRole | null): boolean {
  return role === "OWNER" || role === "MANAGER";
}

export function canManageIntegrations(role: AgencyMemberRole | null): boolean {
  return role === "OWNER";
}

export function canTransferOwnership(role: AgencyMemberRole | null): boolean {
  return role === "OWNER";
}

/** Owner can invite any role; Manager can invite Manager/Staff but never Owner; Staff can't invite. */
export function canInviteRole(actorRole: AgencyMemberRole | null, targetRole: AgencyMemberRole): boolean {
  if (actorRole === "OWNER") return true;
  if (actorRole === "MANAGER") return targetRole !== "OWNER";
  return false;
}

/** Governs remove / promote / demote of an existing team member. Owner has full authority over
 * anyone (subject to the last-owner guard elsewhere); Manager can manage Manager/Staff but never
 * touch an Owner; Staff can't manage anyone. */
export function canManageTeamMember(actorRole: AgencyMemberRole | null, targetRole: AgencyMemberRole): boolean {
  if (actorRole === "OWNER") return true;
  if (actorRole === "MANAGER") return targetRole !== "OWNER";
  return false;
}
