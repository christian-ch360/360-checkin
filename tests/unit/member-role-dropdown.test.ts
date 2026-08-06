import { describe, it, expect } from "vitest";
import {
  memberSchema,
  memberRoleValues,
  adminAssignableRoleValues,
} from "@/features/members/schemas/member.schema";
import { APPLICANT_ROLE_VALUES } from "@/features/members/role-labels";
import { canInviteWithRole } from "@/lib/permissions/member-rules";
import { applicationSchema } from "@/features/applications/schemas/application.schema";

const VALID_FIELDS = {
  fullName: "Jane Creator",
  email: "jane@example.com",
  phone: "",
  status: "ACTIVE" as const,
  companyId: "",
  commissionTierId: "",
  referralSource: "",
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  linkedinUrl: "",
};

describe("Add Member Role dropdown — admin-assignable role values", () => {
  it("still contains exactly the original 10 MemberRole values, unchanged", () => {
    expect(memberRoleValues).toEqual([
      "BRAND",
      "AGENCY",
      "BROKER",
      "BUSINESS_DEVELOPMENT",
      "CREATOR",
      "PROJECT_LEADER",
      "VENDOR",
      "STAFF",
      "ENTERTAINMENT",
      "INVESTOR",
    ]);
  });

  it("defines exactly Admin and Super Admin as the appended values", () => {
    expect(adminAssignableRoleValues).toEqual(["ADMIN", "SUPER_ADMIN"]);
  });

  it("memberSchema still accepts every original MemberRole value", () => {
    for (const role of memberRoleValues) {
      const result = memberSchema.safeParse({ ...VALID_FIELDS, role });
      expect(result.success, `expected ${role} to be valid`).toBe(true);
    }
  });

  it("memberSchema now also accepts ADMIN and SUPER_ADMIN as role values", () => {
    for (const role of adminAssignableRoleValues) {
      const result = memberSchema.safeParse({ ...VALID_FIELDS, role });
      expect(result.success, `expected ${role} to be valid`).toBe(true);
    }
  });

  it("memberSchema rejects an unrelated SystemRole value like MANAGER or GUEST", () => {
    expect(memberSchema.safeParse({ ...VALID_FIELDS, role: "MANAGER" }).success).toBe(false);
    expect(memberSchema.safeParse({ ...VALID_FIELDS, role: "GUEST" }).success).toBe(false);
  });

  it("canInviteWithRole (the same rule createMember enforces) only allows SUPER_ADMIN to assign ADMIN/SUPER_ADMIN", () => {
    for (const role of adminAssignableRoleValues) {
      expect(canInviteWithRole("SUPER_ADMIN", role).allowed).toBe(true);
      expect(canInviteWithRole("ADMIN", role).allowed).toBe(false);
      expect(canInviteWithRole("MEMBER", role).allowed).toBe(false);
      expect(canInviteWithRole("MANAGER", role).allowed).toBe(false);
      expect(canInviteWithRole("GUEST", role).allowed).toBe(false);
    }
  });

  it("public application flow's role list (apply/kiosk) never includes Admin or Super Admin", () => {
    for (const role of adminAssignableRoleValues) {
      expect(APPLICANT_ROLE_VALUES as readonly string[]).not.toContain(role);
    }
  });

  it("the public applicationSchema rejects Admin/Super Admin as a submitted role, specifically on the role field", () => {
    const base = {
      fullName: "Jane Creator",
      email: "jane@example.com",
      phone: "5551234567",
      company: "",
      instagram: "https://instagram.com/jane",
      tiktok: "https://tiktok.com/@jane",
      youtube: "",
      city: "Los Angeles",
      state: "California",
      country: "United States",
      referredBy: "No Referral",
      termsAccepted: true as const,
      privacyAccepted: true as const,
      dataProcessingAccepted: true as const,
      mediaReleaseAccepted: true as const,
    };
    // Sanity check: this base data is otherwise fully valid for a real role.
    expect(applicationSchema.safeParse({ ...base, role: "CREATOR" }).success).toBe(true);

    for (const role of adminAssignableRoleValues) {
      const result = applicationSchema.safeParse({ ...base, role });
      expect(result.success, `expected application role=${role} to be rejected`).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path[0] === "role")).toBe(true);
      }
    }
  });
});
