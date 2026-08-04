import { describe, it, expect } from "vitest";
import { hasPermission, can, canAny } from "@/lib/permissions";

describe("permissions", () => {
  it("grants super admins every permission", () => {
    expect(hasPermission("SUPER_ADMIN", "admin.access")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "settings.manage")).toBe(true);
  });

  it("denies guests everything", () => {
    expect(hasPermission("GUEST", "members.view")).toBe(false);
    expect(canAny("GUEST", ["members.view", "projects.view"])).toBe(false);
  });

  it("lets members view but not manage", () => {
    expect(hasPermission("MEMBER", "members.view")).toBe(true);
    expect(hasPermission("MEMBER", "members.manage")).toBe(false);
  });

  it("lets project leaders manage projects and spaces but not commissions", () => {
    expect(hasPermission("PROJECT_LEADER", "projects.manage")).toBe(true);
    expect(hasPermission("PROJECT_LEADER", "spaces.manage")).toBe(true);
    expect(hasPermission("PROJECT_LEADER", "commissions.manage")).toBe(false);
  });

  it("can() requires every permission in the list", () => {
    expect(can("MANAGER", ["members.view", "members.manage"])).toBe(true);
    expect(can("MANAGER", ["members.view", "admin.access"])).toBe(false);
  });

  it("splits legal.manage (Admin+) from legal.publish (Super Admin only) — mirrors billing.manage/billing.override", () => {
    expect(hasPermission("ADMIN", "legal.manage")).toBe(true);
    expect(hasPermission("ADMIN", "legal.publish")).toBe(false);
    expect(hasPermission("SUPER_ADMIN", "legal.manage")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "legal.publish")).toBe(true);
    expect(hasPermission("MANAGER", "legal.manage")).toBe(false);
  });
});
