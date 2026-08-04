import { describe, it, expect } from "vitest";
import {
  REFERRAL_ELIGIBLE_ROLES,
  isReferralEligibleRole,
  referralCodePrefixFor,
} from "@/features/referrals/config/referral-config";

describe("referral-config (future-expansion surface)", () => {
  it("AGENCY is referral-eligible today, with prefix AGY", () => {
    expect(isReferralEligibleRole("AGENCY")).toBe(true);
    expect(referralCodePrefixFor("AGENCY")).toBe("AGY");
    expect(REFERRAL_ELIGIBLE_ROLES).toContain("AGENCY");
  });

  it("other MemberRoles are not yet referral-eligible (until extended)", () => {
    for (const role of ["BRAND", "BROKER", "BUSINESS_DEVELOPMENT", "CREATOR", "STAFF", "PROJECT_LEADER", "VENDOR", "ENTERTAINMENT", "INVESTOR"] as const) {
      expect(isReferralEligibleRole(role)).toBe(false);
      expect(referralCodePrefixFor(role)).toBeNull();
    }
  });
});
