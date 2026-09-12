import { describe, it, expect } from "vitest";
import { canManageMemberRole, canDeleteMember, canEditMemberProfile, canInviteWithRole } from "@/lib/permissions/member-rules";

// Covers the guard functions behind the Permissions card / updateMemberSystemRole
// and the member Danger Zone / deleteMemberAction — the actual enforcement for
// "who can promote/demote/delete whom." isLastSuperAdmin (the DB-backed half of
// the same protection) is covered separately in
// tests/integration/member-role-guards.test.ts, since it needs a real Postgres
// count query and these do not.

const superAdmin = { id: "actor-1", systemRole: "SUPER_ADMIN" as const };
const admin = { id: "actor-2", systemRole: "ADMIN" as const };
const member = { id: "actor-3", systemRole: "MEMBER" as const };
const target = { id: "target-1" };

describe("canManageMemberRole (Permissions card / updateMemberSystemRole gate)", () => {
  it("allows a Super Admin to change another member's role", () => {
    expect(canManageMemberRole(superAdmin, target).allowed).toBe(true);
  });

  it("denies an Admin — roles.manage is Super Admin only", () => {
    const result = canManageMemberRole(admin, target);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Super Admin/i);
  });

  it("denies a plain Member", () => {
    expect(canManageMemberRole(member, target).allowed).toBe(false);
  });

  it("denies a Super Admin changing their own role — self-demotion/self-promotion guard", () => {
    const self = { id: superAdmin.id };
    const result = canManageMemberRole(superAdmin, self);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/own permissions/i);
  });
});

describe("canDeleteMember (Danger Zone / deleteMemberAction gate)", () => {
  it("allows a Super Admin to delete another member", () => {
    expect(canDeleteMember(superAdmin, target).allowed).toBe(true);
  });

  it("denies an Admin — members.delete is Super Admin only", () => {
    expect(canDeleteMember(admin, target).allowed).toBe(false);
  });

  it("denies self-deletion, independent of role", () => {
    const self = { id: superAdmin.id };
    const result = canDeleteMember(superAdmin, self);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/own account/i);
  });
});

describe("canEditMemberProfile (profile-field edit gate)", () => {
  it("only a Super Admin may edit a Super Admin's own profile fields", () => {
    expect(canEditMemberProfile("SUPER_ADMIN", "SUPER_ADMIN")).toBe(true);
    expect(canEditMemberProfile("ADMIN", "SUPER_ADMIN")).toBe(false);
  });

  it("any members.manage holder may edit a non-Super-Admin's profile", () => {
    expect(canEditMemberProfile("ADMIN", "MEMBER")).toBe(true);
    expect(canEditMemberProfile("ADMIN", "ADMIN")).toBe(true);
  });
});

describe("canInviteWithRole (invite-time privilege-escalation gate)", () => {
  it("only roles.manage holders may invite someone directly as Admin or Super Admin", () => {
    expect(canInviteWithRole("SUPER_ADMIN", "ADMIN").allowed).toBe(true);
    expect(canInviteWithRole("SUPER_ADMIN", "SUPER_ADMIN").allowed).toBe(true);
    expect(canInviteWithRole("ADMIN", "ADMIN").allowed).toBe(false);
    expect(canInviteWithRole("ADMIN", "SUPER_ADMIN").allowed).toBe(false);
  });

  it("does not restrict inviting as a non-privileged role", () => {
    expect(canInviteWithRole("ADMIN", "MEMBER").allowed).toBe(true);
  });
});
