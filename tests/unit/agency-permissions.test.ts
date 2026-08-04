import { describe, it, expect } from "vitest";
import {
  canApproveCreatorRequests,
  canViewAnalytics,
  canEditAgencyProfile,
  canManageIntegrations,
  canTransferOwnership,
  canInviteRole,
  canManageTeamMember,
} from "@/features/agencies/config/agency-permissions";

describe("Agency Team Permissions matrix", () => {
  it("canApproveCreatorRequests: Owner and Manager only", () => {
    expect(canApproveCreatorRequests("OWNER")).toBe(true);
    expect(canApproveCreatorRequests("MANAGER")).toBe(true);
    expect(canApproveCreatorRequests("STAFF")).toBe(false);
    expect(canApproveCreatorRequests(null)).toBe(false);
  });

  it("canViewAnalytics: Owner, Manager, and Staff can all view", () => {
    expect(canViewAnalytics("OWNER")).toBe(true);
    expect(canViewAnalytics("MANAGER")).toBe(true);
    expect(canViewAnalytics("STAFF")).toBe(true);
    expect(canViewAnalytics(null)).toBe(false);
  });

  it("canEditAgencyProfile: Owner and Manager only", () => {
    expect(canEditAgencyProfile("OWNER")).toBe(true);
    expect(canEditAgencyProfile("MANAGER")).toBe(true);
    expect(canEditAgencyProfile("STAFF")).toBe(false);
  });

  it("canManageIntegrations: Owner only", () => {
    expect(canManageIntegrations("OWNER")).toBe(true);
    expect(canManageIntegrations("MANAGER")).toBe(false);
    expect(canManageIntegrations("STAFF")).toBe(false);
  });

  it("canTransferOwnership: Owner only", () => {
    expect(canTransferOwnership("OWNER")).toBe(true);
    expect(canTransferOwnership("MANAGER")).toBe(false);
    expect(canTransferOwnership("STAFF")).toBe(false);
    expect(canTransferOwnership(null)).toBe(false);
  });

  describe("canInviteRole", () => {
    it("Owner can invite anyone, including another Owner", () => {
      expect(canInviteRole("OWNER", "OWNER")).toBe(true);
      expect(canInviteRole("OWNER", "MANAGER")).toBe(true);
      expect(canInviteRole("OWNER", "STAFF")).toBe(true);
    });

    it("Manager can invite Staff and Managers, but never an Owner", () => {
      expect(canInviteRole("MANAGER", "MANAGER")).toBe(true);
      expect(canInviteRole("MANAGER", "STAFF")).toBe(true);
      expect(canInviteRole("MANAGER", "OWNER")).toBe(false);
    });

    it("Staff cannot invite anyone", () => {
      expect(canInviteRole("STAFF", "STAFF")).toBe(false);
      expect(canInviteRole("STAFF", "MANAGER")).toBe(false);
      expect(canInviteRole("STAFF", "OWNER")).toBe(false);
    });
  });

  describe("canManageTeamMember (role changes, removal)", () => {
    it("Owner can manage anyone, including another Owner", () => {
      expect(canManageTeamMember("OWNER", "OWNER")).toBe(true);
      expect(canManageTeamMember("OWNER", "MANAGER")).toBe(true);
      expect(canManageTeamMember("OWNER", "STAFF")).toBe(true);
    });

    it("Manager can manage Manager/Staff but can never touch an Owner (cannot promote or remove Owners)", () => {
      expect(canManageTeamMember("MANAGER", "MANAGER")).toBe(true);
      expect(canManageTeamMember("MANAGER", "STAFF")).toBe(true);
      expect(canManageTeamMember("MANAGER", "OWNER")).toBe(false);
    });

    it("Staff cannot manage anyone", () => {
      expect(canManageTeamMember("STAFF", "STAFF")).toBe(false);
      expect(canManageTeamMember("STAFF", "OWNER")).toBe(false);
    });
  });
});
