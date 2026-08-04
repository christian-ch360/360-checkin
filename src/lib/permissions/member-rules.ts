import type { SystemRole } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

// Single source of truth for SystemRole (User Role) display/value lists —
// import this instead of hand-writing another Record<SystemRole, string>.
export const systemRoleValues = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "PROJECT_LEADER",
  "MEMBER",
  "GUEST",
] as const;

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  PROJECT_LEADER: "Project Leader",
  MEMBER: "Member",
  GUEST: "Guest",
};

// The 3 roles the simplified Permissions card and invite form work with —
// Manager/Project Leader/Guest are legacy values managed only from the full
// /admin Permissions table.
export const STANDARD_SYSTEM_ROLES: SystemRole[] = ["MEMBER", "ADMIN", "SUPER_ADMIN"];

// Roles that require roles.manage to grant — used both to gate invites
// server-side and to filter the invite form's role options client-side.
export const RESTRICTED_INVITE_ROLES: SystemRole[] = ["ADMIN", "SUPER_ADMIN"];

/**
 * Whether actorRole may edit targetRole's profile fields (Role,
 * company, phone, social links, status, notes). Assumes the caller has
 * already checked the actor holds members.manage in general — this only
 * adds the extra restriction that Super Admin profiles are Super-Admin-only.
 */
export function canEditMemberProfile(actorRole: SystemRole, targetRole: SystemRole): boolean {
  if (targetRole === "SUPER_ADMIN") return hasPermission(actorRole, "roles.manage");
  return true;
}

export type RuleResult = { allowed: boolean; reason?: string };

/** Whether actor may change target's User Role (the Permissions card / updateMemberSystemRole). */
export function canManageMemberRole(
  actor: { id: string; systemRole: SystemRole },
  target: { id: string }
): RuleResult {
  if (!hasPermission(actor.systemRole, "roles.manage")) {
    return { allowed: false, reason: "Only Super Admins can change permissions." };
  }
  if (actor.id === target.id) {
    return { allowed: false, reason: "You can't change your own permissions." };
  }
  return { allowed: true };
}

/** Whether actor may delete target (the Danger Zone / deleteMemberAction). */
export function canDeleteMember(
  actor: { id: string; systemRole: SystemRole },
  target: { id: string }
): RuleResult {
  if (!hasPermission(actor.systemRole, "members.delete")) {
    return { allowed: false, reason: "Only Super Admins can delete members." };
  }
  if (actor.id === target.id) {
    return { allowed: false, reason: "You can't delete your own account." };
  }
  return { allowed: true };
}

/** Whether actorRole may invite a new member directly as `role`. */
export function canInviteWithRole(actorRole: SystemRole, role: SystemRole): RuleResult {
  if (RESTRICTED_INVITE_ROLES.includes(role) && !hasPermission(actorRole, "roles.manage")) {
    return { allowed: false, reason: "Only Super Admins can invite Admins or Super Admins." };
  }
  return { allowed: true };
}
