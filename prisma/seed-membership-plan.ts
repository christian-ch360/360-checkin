import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PREVIOUS_PLAN_NAME = "CreatorHub360 Founding Membership";

const MEMBERSHIP_PLAN = {
  name: "CreatorHub360 Membership",
  description: "The only membership plan today — priced to reward the first wave of creators who join the platform.",
  priceCents: 9900,
  trialMonths: 3,
  benefits: [
    "Full facility access — spaces, booths, and studios",
    "GMV and commission tracking on every project",
    "Collab Hub access to find and be found by other creators",
    "Priority support from the CreatorHub360 team",
  ],
};

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  if (orgs.length === 0) {
    console.log("No organizations found — nothing to seed.");
    return;
  }

  for (const org of orgs) {
    console.log(`\nOrganization: ${org.name} (${org.id})`);

    // One-time rename of the previously-seeded plan — name-matching below
    // would otherwise treat "CreatorHub360 Membership" as a brand new plan
    // and create a duplicate row alongside the old "Founding Membership" one.
    await prisma.membershipPlan.updateMany({
      where: { organizationId: org.id, name: PREVIOUS_PLAN_NAME },
      data: { name: MEMBERSHIP_PLAN.name },
    });

    // No @@unique on (organizationId, name) — find-or-create keeps this idempotent.
    const existingPlan = await prisma.membershipPlan.findFirst({
      where: { organizationId: org.id, name: MEMBERSHIP_PLAN.name },
    });
    const plan = existingPlan ?? (await prisma.membershipPlan.create({ data: { organizationId: org.id, ...MEMBERSHIP_PLAN } }));
    console.log(`  plan ready: ${plan.name} (${plan.id})`);

    // Only already-approved members get a backfilled subscription — PENDING
    // members get one when approveMemberAction approves them (see
    // src/features/members/services/approval-actions.ts), not before.
    const membersWithoutSubscription = await prisma.member.findMany({
      where: { organizationId: org.id, deletedAt: null, subscription: null, status: { notIn: ["PENDING", "REJECTED"] } },
      select: { id: true, memberNumber: true, memberSince: true },
    });

    for (const member of membersWithoutSubscription) {
      await prisma.memberSubscription.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          status: "ACTIVE",
          startedAt: member.memberSince,
        },
      });
      console.log(`  backfilled subscription for ${member.memberNumber}`);
    }
    if (membersWithoutSubscription.length === 0) {
      console.log("  every member already has a subscription");
    }
  }

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error("\nFailed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
