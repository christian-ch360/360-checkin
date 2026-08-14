import { describe, it, expect } from "vitest";
import {
  REFERRAL_ELIGIBLE_ROLES,
  isReferralEligibleRole,
  referralCodePrefixFor,
} from "@/features/referrals/config/referral-config";

describe("referral-config (every member role is referral-eligible)", () => {
  it("AGENCY is referral-eligible, with prefix AGY", () => {
    expect(isReferralEligibleRole("AGENCY")).toBe(true);
    expect(referralCodePrefixFor("AGENCY")).toBe("AGY");
    expect(REFERRAL_ELIGIBLE_ROLES).toContain("AGENCY");
  });

  it("every standard MemberRole is referral-eligible, each with a unique prefix", () => {
    const roles = ["BRAND", "BROKER", "BUSINESS_DEVELOPMENT", "CREATOR", "STAFF", "PROJECT_LEADER", "VENDOR", "ENTERTAINMENT", "INVESTOR"] as const;
    const prefixes = new Set<string>();
    for (const role of roles) {
      expect(isReferralEligibleRole(role)).toBe(true);
      const prefix = referralCodePrefixFor(role);
      expect(prefix).not.toBeNull();
      prefixes.add(prefix!);
    }
    expect(prefixes.size).toBe(roles.length); // no two roles share a prefix
  });
});
