import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getPlanBenefits, getMemberFeatureValue } from "@/features/membership-plans/services/membership-features.service";
import { getRemainingUsage, consumeUsage, hasFeatureAccess } from "@/features/membership-plans/services/membership-usage.service";
import { requireSpaceTypeAccess } from "@/features/spaces/services/space-membership-gate";
import { logMembershipLifecycleEvent } from "@/features/membership-plans/services/membership-lifecycle-log";
import { getMembershipAnalytics } from "@/features/membership-plans/services/membership-analytics.service";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
let memberId: string;
let basicPlanId: string;
let premiumPlanId: string;
let guestPassFeatureId: string;
let boardRoomFeatureId: string;

async function createMember(label: string) {
  const member = await prisma.member.create({
    data: {
      organizationId,
      memberNumber: `TEST-PKG-${label}-${runId}`,
      fullName: `Package Tester ${label}`,
      email: `package-tester-${label}-${runId}@example.com`,
      role: "CREATOR",
      status: "ACTIVE",
    },
  });
  return member.id;
}

describe("Membership Package system (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Packages ${runId}`, slug: `test-org-packages-${runId}` },
    });
    organizationId = org.id;

    memberId = await createMember("MAIN");

    // MembershipFeature.key is unique per (organizationId, key), so plain
    // literal keys are safe here even though other test files' orgs may use
    // the same names — no cross-org collision risk.
    guestPassFeatureId = (
      await prisma.membershipFeature.create({
        data: {
          organizationId,
          key: "guest_passes_per_day",
          label: "Guest Passes Per Day",
          valueType: "NUMBER",
          resetPeriod: "DAILY",
        },
      })
    ).id;

    boardRoomFeatureId = (
      await prisma.membershipFeature.create({
        data: {
          organizationId,
          key: "board_room_access",
          label: "Executive Board Room Access",
          valueType: "BOOLEAN",
          resetPeriod: "NONE",
        },
      })
    ).id;

    basicPlanId = (
      await prisma.membershipPlan.create({
        data: {
          organizationId,
          name: "Basic Package",
          priceCents: 9900,
          sortOrder: 0,
          benefits: ["Community Access"],
          appliesTo: "CREATOR",
        },
      })
    ).id;

    premiumPlanId = (
      await prisma.membershipPlan.create({
        data: {
          organizationId,
          name: "Premium Package",
          priceCents: 49900,
          sortOrder: 1,
          benefits: [],
          appliesTo: "CREATOR",
        },
      })
    ).id;

    await prisma.membershipPlanFeatureValue.create({
      data: { planId: basicPlanId, featureId: guestPassFeatureId, numberValue: 1 },
    });
    await prisma.membershipPlanFeatureValue.create({
      data: { planId: premiumPlanId, featureId: guestPassFeatureId, numberValue: 6 },
    });
    await prisma.membershipPlanFeatureValue.create({
      data: { planId: premiumPlanId, featureId: boardRoomFeatureId, boolValue: true, displayOverride: "Executive Board Room Access" },
    });

    await prisma.memberSubscription.create({
      data: { memberId, planId: basicPlanId, status: "ACTIVE" },
    });
  });

  afterAll(async () => {
    await prisma.membershipLifecycleEvent.deleteMany({ where: { organizationId } });
    await prisma.membershipUsageCounter.deleteMany({ where: { member: { organizationId } } });
    await prisma.memberSubscription.deleteMany({ where: { member: { organizationId } } });
    await prisma.membershipPlanFeatureValue.deleteMany({ where: { plan: { organizationId } } });
    await prisma.membershipPlan.deleteMany({ where: { organizationId } });
    await prisma.membershipFeature.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("renders a plan's structured feature values plus free-text benefits into one benefit list", async () => {
    const benefits = await getPlanBenefits(basicPlanId);
    expect(benefits).toContain("Community Access");
    expect(benefits).toContain("1 Guest Passes Per Day");
  });

  it("reads a subscribed member's value for a given feature key", async () => {
    const value = await getMemberFeatureValue(memberId, "guest_passes_per_day");
    expect(value?.numberValue).toBe(1);
  });

  it("enforces a member's DAILY guest-pass limit via consumeUsage, and reports remaining usage", async () => {
    const before = await getRemainingUsage(memberId, "guest_passes_per_day");
    expect(before).toMatchObject({ included: true, isUnlimited: false, limit: 1, used: 0, remaining: 1 });

    const first = await consumeUsage(memberId, "guest_passes_per_day", 1);
    expect(first).toMatchObject({ allowed: true, remaining: 0 });

    const second = await consumeUsage(memberId, "guest_passes_per_day", 1);
    expect(second.allowed).toBe(false);

    const after = await getRemainingUsage(memberId, "guest_passes_per_day");
    expect(after).toMatchObject({ used: 1, remaining: 0 });
  });

  it("gates access to a Board Room-type space by the board_room_access feature, matching the CONFERENCE_ROOM space type mapping", async () => {
    // The member is on Basic, which doesn't include board room access.
    const deniedAccess = await requireSpaceTypeAccess(memberId, "CONFERENCE_ROOM");
    expect(deniedAccess.allowed).toBe(false);

    const hasAccess = await hasFeatureAccess(memberId, "board_room_access");
    expect(hasAccess).toBe(false);

    await prisma.memberSubscription.update({ where: { memberId }, data: { planId: premiumPlanId } });
    const hasAccessAfterUpgrade = await hasFeatureAccess(memberId, "board_room_access");
    expect(hasAccessAfterUpgrade).toBe(true);

    const allowedAccess = await requireSpaceTypeAccess(memberId, "CONFERENCE_ROOM");
    expect(allowedAccess.allowed).toBe(true);

    // A space type not in the gated map (e.g. an editing suite) is open to
    // any member regardless of package.
    const ungatedSpaceAccess = await requireSpaceTypeAccess(memberId, "EDITING_SUITE");
    expect(ungatedSpaceAccess.allowed).toBe(true);

    await prisma.memberSubscription.update({ where: { memberId }, data: { planId: basicPlanId } });
  });

  it("logs lifecycle events and rolls them up into org-wide MRR/ARR/churn/trial-conversion analytics", async () => {
    await logMembershipLifecycleEvent({ organizationId, memberId, type: "SUBSCRIBED", toPlanId: basicPlanId });
    await logMembershipLifecycleEvent({ organizationId, memberId, type: "TRIAL_CONVERTED", toPlanId: basicPlanId });
    await logMembershipLifecycleEvent({ organizationId, memberId, type: "UPGRADED", fromPlanId: basicPlanId, toPlanId: premiumPlanId });

    const analytics = await getMembershipAnalytics(organizationId);
    expect(analytics.mrrCents).toBe(9900); // subscription row itself is still on basicPlanId
    expect(analytics.activeCount).toBe(1);
    expect(analytics.membersByPackage).toContainEqual({ planId: basicPlanId, planName: "Basic Package", count: 1 });
    expect(analytics.allTime.SUBSCRIBED).toBe(1);
    expect(analytics.allTime.TRIAL_CONVERTED).toBe(1);
    expect(analytics.allTime.UPGRADED).toBe(1);
    expect(analytics.trialConversionRate).toBe(100);
  });
});
