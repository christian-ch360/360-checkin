import "server-only";

import { prisma } from "@/lib/db/prisma";
import { EmailService } from "@/lib/email/email-service";
import { GRACE_PERIOD_DAYS } from "@/features/membership-plans/config/billing-config";
import { logMembershipLifecycleEvent } from "@/features/membership-plans/services/membership-lifecycle-log";

const TRIAL_ENDING_SOON_WINDOW_DAYS = 3;

/**
 * Daily sweep over every org's subscriptions. There's no real payment
 * gateway behind this app (subscription status is an internal tracker, per
 * the schema's own comment) — so this is the closest thing to real billing
 * lifecycle events: a trial nearing its end gets warned, a trial past its
 * end with no cancellation auto-activates (there's no Stripe-backed gate to
 * condition it on otherwise), an ACTIVE subscription past its period end
 * without a recorded payment flips to PAST_DUE, a PAST_DUE subscription past
 * its grace period expires (see GRACE_PERIOD_DAYS), and a CANCELED
 * subscription past its scheduled cancelAt date expires.
 */
export async function runSubscriptionLifecycle() {
  const now = new Date();
  const results = { trialEndingSoonNotified: 0, activated: 0, pastDueMarked: 0, expired: 0, pricingApplied: 0 };

  const trialEndingSoonCutoff = new Date(now.getTime() + TRIAL_ENDING_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const trialsEndingSoon = await prisma.memberSubscription.findMany({
    where: {
      status: "TRIALING",
      trialEndsAt: { gt: now, lte: trialEndingSoonCutoff },
      trialEndingSoonNotifiedAt: null,
    },
    include: { member: true, plan: true },
  });
  for (const sub of trialsEndingSoon) {
    if (!sub.trialEndsAt) continue;
    await EmailService.sendTrialEndingSoonEmail({
      to: sub.member.email,
      fullName: sub.member.fullName,
      planName: sub.plan.name,
      trialEndsAt: sub.trialEndsAt,
      organizationId: sub.member.organizationId,
      memberId: sub.memberId,
    });
    await prisma.memberSubscription.update({
      where: { id: sub.id },
      data: { trialEndingSoonNotifiedAt: now },
    });
    results.trialEndingSoonNotified++;
  }

  const trialsToActivate = await prisma.memberSubscription.findMany({
    where: { status: "TRIALING", trialEndsAt: { lte: now } },
    include: { member: true, plan: true },
  });
  for (const sub of trialsToActivate) {
    await prisma.memberSubscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", currentPeriodEnd: addMonths(now, 1) },
    });
    await EmailService.sendMembershipActivatedEmail({
      to: sub.member.email,
      fullName: sub.member.fullName,
      planName: sub.plan.name,
      organizationId: sub.member.organizationId,
      memberId: sub.memberId,
    });
    await logMembershipLifecycleEvent({
      organizationId: sub.member.organizationId,
      memberId: sub.memberId,
      type: "TRIAL_CONVERTED",
      toPlanId: sub.planId,
    });
    results.activated++;
  }

  const subsPastDue = await prisma.memberSubscription.findMany({
    where: { status: "ACTIVE", currentPeriodEnd: { lte: now } },
    include: { member: true, plan: true },
  });
  for (const sub of subsPastDue) {
    await prisma.memberSubscription.update({
      where: { id: sub.id },
      data: { status: "PAST_DUE" },
    });
    await EmailService.sendPaymentFailedEmail({
      to: sub.member.email,
      fullName: sub.member.fullName,
      planName: sub.plan.name,
      supportEmail: process.env.SUPPORT_EMAIL ?? "support@creatorhub360.com",
      organizationId: sub.member.organizationId,
      memberId: sub.memberId,
      priority: "critical",
    });
    await logMembershipLifecycleEvent({
      organizationId: sub.member.organizationId,
      memberId: sub.memberId,
      type: "PAST_DUE",
      toPlanId: sub.planId,
    });
    results.pastDueMarked++;
  }

  // PAST_DUE past its grace period, or CANCELED past its scheduled
  // cancelAt — both reach the same terminal state, access fully ends.
  const graceCutoff = new Date(now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const subsToExpire = await prisma.memberSubscription.findMany({
    where: {
      OR: [
        { status: "PAST_DUE", currentPeriodEnd: { lte: graceCutoff } },
        { status: "CANCELED", cancelAt: { lte: now } },
      ],
    },
    include: { member: true },
  });
  for (const sub of subsToExpire) {
    await prisma.memberSubscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
    await logMembershipLifecycleEvent({
      organizationId: sub.member.organizationId,
      memberId: sub.memberId,
      type: "EXPIRED",
      fromPlanId: sub.planId,
    });
    results.expired++;
  }

  // Apply any scheduled price changes that have reached their effective date
  // ("Schedule future pricing changes" — see schedulePriceChange in actions.ts).
  const schedulesDue = await prisma.membershipPricingSchedule.findMany({
    where: { effectiveAt: { lte: now }, appliedAt: null },
  });
  for (const schedule of schedulesDue) {
    await prisma.$transaction([
      prisma.membershipPlan.update({
        where: { id: schedule.planId },
        data: { priceCents: schedule.newPriceCents },
      }),
      prisma.membershipPricingSchedule.update({
        where: { id: schedule.id },
        data: { appliedAt: now },
      }),
    ]);
    results.pricingApplied++;
  }

  return results;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
