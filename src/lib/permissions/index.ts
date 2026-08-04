import type { SystemRole } from "@prisma/client";

const ALL_PERMISSIONS = [
  "members.view",
  "members.manage",
  "members.approve",
  "projects.view",
  "projects.manage",
  "gmv.view",
  "gmv.manage",
  "commissions.view",
  "commissions.manage",
  "checkin.manage",
  "spaces.manage",
  "reports.view",
  "reports.export",
  "admin.access",
  "settings.manage",
  "feedback.manage",
  "billing.manage",
  "dev_tools.access",
  "communications.manage",
  "roles.manage",
  "members.delete",
  "billing.override",
  "legal.manage",
  "legal.publish",
  "referrals.transfer",
  "agencies.merge",
  "agencies.access_override",
  "kiosk.manage",
  "events.manage",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  // Every permission that exists, by construction — SUPER_ADMIN never has to be
  // manually kept in sync when a new Permission is added above.
  SUPER_ADMIN: [...ALL_PERMISSIONS],
  ADMIN: [
    "members.view",
    "members.manage",
    "members.approve",
    "projects.view",
    "projects.manage",
    "gmv.view",
    "gmv.manage",
    "commissions.view",
    "commissions.manage",
    "checkin.manage",
    "spaces.manage",
    "reports.view",
    "reports.export",
    "admin.access",
    "settings.manage",
    "feedback.manage",
    "billing.manage",
    "legal.manage",
    "events.manage",
  ],
  MANAGER: [
    "members.view",
    "members.manage",
    "projects.view",
    "projects.manage",
    "gmv.view",
    "gmv.manage",
    "commissions.view",
    "checkin.manage",
    "spaces.manage",
    "reports.view",
    "reports.export",
    "feedback.manage",
  ],
  PROJECT_LEADER: [
    "members.view",
    "projects.view",
    "projects.manage",
    "gmv.view",
    "commissions.view",
    "checkin.manage",
    "spaces.manage",
    "reports.view",
  ],
  MEMBER: ["members.view", "projects.view", "gmv.view", "commissions.view"],
  GUEST: [],
};

export function hasPermission(role: SystemRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function can(role: SystemRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function canAny(role: SystemRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
