"use server";

import { addMonths } from "date-fns";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { EmailService } from "@/lib/email/email-service";
import {
  recordMembershipPaymentSchema,
  type RecordMembershipPaymentInput,
} from "@/features/members/schemas/membership.schema";
import { logMembershipLifecycleEvent } from "@/features/membership-plans/services/membership-lifecycle-log";
import { consumeUsage } from "@/features/membership-plans/services/membership-usage.service";
import { requireStripe, isStripeConfigured } from "@/lib/stripe/stripe";

export type MembershipActionResult = { success: true; pendingStripeSync?: boolean } | { success: false; error: string };
export type UseGuestPassResult = { success: true; remaining: number | null } | { success: false; error: string };

/**
 * Records a payment against a member's subscription, rolls currentPeriodEnd
 * forward by one billing interval (only MONTHLY exists today), and clears a
 * PAST_DUE status back to ACTIVE — this app has no real payment gate, so
 * this is the manual admin equivalent of a successful billing-provider
 * charge. Sends the same renewal confirmation a real billing webhook would.
 */
export async function recordMembershipPayment(input: RecordMembershipPaymentInput): Promise<MembershipActionResult> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "billing.manage")) {
    return { success: false, error: "You don't have permission to record payments." };
  }

  const parsed = recordMembershipPaymentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const amountCents = Math.round(Number(parsed.data.amountDollars) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { success: false, error: "Enter a valid payment amount." };
  }

  const subscription = await prisma.memberSubscription.findFirst({
    where: { id: parsed.data.subscriptionId, member: { organizationId: actor.organizationId } },
    include: { member: true, plan: true },
  });
  if (!subscription) return { success: false, error: "Subscription not found." };

  const nextPeriodEnd = addMonths(subscription.currentPeriodEnd ?? new Date(), 1);

  const [, updated] = await prisma.$transaction([
    prisma.membershipPayment.create({
      data: {
        memberSubscriptionId: subscription.id,
        amountCents,
        note: parsed.data.note || null,
      },
    }),
    prisma.memberSubscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodEnd: nextPeriodEnd,
        status: subscription.status === "PAST_DUE" ? "ACTIVE" : subscription.status,
      },
    }),
  ]);

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "membership.payment_recorded",
    entityType: "member_subscription",
    entityId: subscription.id,
    after: { amountCents, currentPeriodEnd: nextPeriodEnd },
  });

  await EmailService.sendSubscriptionRenewalEmail({
    to: subscription.member.email,
    fullName: subscription.member.fullName,
    planName: subscription.plan.name,
    amount: amountCents / 100,
    currentPeriodEnd: updated.currentPeriodEnd ?? nextPeriodEnd,
    organizationId: actor.organizationId,
    memberId: subscription.memberId,
    priority: "critical",
  });

  revalidatePath(`/members/${subscription.memberId}`);
  return { success: true };
}

/**
 * Self-service cancel — the member's own membership, "cancel at period
 * end" style: access continues until cancelAt (the current period's end),
 * matching standard subscription UX and requireActiveMembership()'s
 * CANCELED handling.
 *
 * Branches on whether this subscription is Stripe-backed
 * (externalSubscriptionId set — see stripe-billing.service.ts):
 *   - Stripe-backed: tells Stripe to cancel at period end and stops there.
 *     Local status/cancelAt are NOT flipped here — the webhook
 *     (customer.subscription.updated, see /api/stripe/webhook) is the
 *     source of truth and syncs them moments later. Never assume the local
 *     write happened just because the Stripe API call succeeded.
 *   - Not Stripe-backed (trial/legacy/admin-managed): exact original
 *     local-only behavior, unchanged — no Stripe subscription exists to
 *     tell, so this remains the only source of truth for these members.
 */
export async function cancelMembership(): Promise<MembershipActionResult> {
  const actor = await requireCurrentMember();

  const subscription = await prisma.memberSubscription.findUnique({ where: { memberId: actor.id } });
  if (!subscription) return { success: false, error: "No membership found." };
  if (subscription.status === "CANCELED" || subscription.status === "EXPIRED") {
    return { success: false, error: "Membership is already canceled." };
  }

  if (subscription.externalSubscriptionId) {
    if (!isStripeConfigured()) return { success: false, error: "Billing isn't configured yet. Contact an admin." };
    try {
      const stripe = requireStripe();
      await stripe.subscriptions.update(subscription.externalSubscriptionId, { cancel_at_period_end: true });
    } catch (error) {
      console.error("[stripe] cancel-at-period-end failed", error instanceof Error ? error.message : error);
      return { success: false, error: "Couldn't reach Stripe to cancel — try again." };
    }

    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "membership.cancel_requested_stripe",
      entityType: "member_subscription",
      entityId: subscription.id,
      after: { externalSubscriptionId: subscription.externalSubscriptionId },
    });

    revalidatePath("/profile");
    revalidatePath("/settings");
    return { success: true, pendingStripeSync: true };
  }

  const cancelAt = subscription.currentPeriodEnd ?? new Date();
  await prisma.memberSubscription.update({
    where: { id: subscription.id },
    data: { status: "CANCELED", canceledAt: new Date(), cancelAt },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "membership.canceled",
    entityType: "member_subscription",
    entityId: subscription.id,
    before: { status: subscription.status },
    after: { status: "CANCELED", cancelAt },
  });

  await logMembershipLifecycleEvent({
    organizationId: actor.organizationId,
    memberId: actor.id,
    type: "CANCELED",
    fromPlanId: subscription.planId,
  });

  revalidatePath("/profile");
  revalidatePath("/settings");
  return { success: true };
}

/**
 * Undoes a self-service cancel while access hasn't lapsed yet (cancelAt in
 * the future). Same Stripe-backed-vs-local branch as cancelMembership.
 */
export async function resumeMembership(): Promise<MembershipActionResult> {
  const actor = await requireCurrentMember();

  const subscription = await prisma.memberSubscription.findUnique({ where: { memberId: actor.id } });
  if (!subscription) return { success: false, error: "No membership found." };
  if (subscription.status !== "CANCELED" || !subscription.cancelAt || subscription.cancelAt <= new Date()) {
    return { success: false, error: "This membership can't be resumed anymore." };
  }

  if (subscription.externalSubscriptionId) {
    if (!isStripeConfigured()) return { success: false, error: "Billing isn't configured yet. Contact an admin." };
    try {
      const stripe = requireStripe();
      await stripe.subscriptions.update(subscription.externalSubscriptionId, { cancel_at_period_end: false });
    } catch (error) {
      console.error("[stripe] resume (undo cancel-at-period-end) failed", error instanceof Error ? error.message : error);
      return { success: false, error: "Couldn't reach Stripe to resume — try again." };
    }

    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "membership.resume_requested_stripe",
      entityType: "member_subscription",
      entityId: subscription.id,
      after: { externalSubscriptionId: subscription.externalSubscriptionId },
    });

    revalidatePath("/profile");
    revalidatePath("/settings");
    return { success: true, pendingStripeSync: true };
  }

  await prisma.memberSubscription.update({
    where: { id: subscription.id },
    data: { status: "ACTIVE", canceledAt: null, cancelAt: null },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "membership.resumed",
    entityType: "member_subscription",
    entityId: subscription.id,
    before: { status: "CANCELED" },
    after: { status: "ACTIVE" },
  });

  await logMembershipLifecycleEvent({
    organizationId: actor.organizationId,
    memberId: actor.id,
    type: "RESUMED",
    toPlanId: subscription.planId,
  });

  revalidatePath("/profile");
  revalidatePath("/settings");
  return { success: true };
}

/**
 * Self-service "Use a guest pass" — decrements the member's DAILY
 * "Guest Passes Per Day" balance by one. Simple counter increment, not a
 * full visitor-sponsorship flow (no guest identity is captured here).
 */
export async function useGuestPass(): Promise<UseGuestPassResult> {
  const actor = await requireCurrentMember();
  const result = await consumeUsage(actor.id, "guest_passes_per_day", 1);
  if (!result.allowed) return { success: false, error: result.reason };

  revalidatePath("/profile");
  return { success: true, remaining: result.remaining };
}

/**
 * Self-service plan switch — "Upgrade Membership" / "Downgrade Membership"
 * on the member dashboard. Keeps the subscription's current status
 * (TRIALING stays TRIALING, ACTIVE stays ACTIVE) and billing dates
 * untouched, only the plan and its price change immediately; direction
 * (UPGRADED vs DOWNGRADED) is derived from the price delta for analytics.
 */
export async function changeMembershipPlan(newPlanId: string): Promise<MembershipActionResult> {
  const actor = await requireCurrentMember();

  const subscription = await prisma.memberSubscription.findUnique({
    where: { memberId: actor.id },
    include: { plan: true },
  });
  if (!subscription) return { success: false, error: "No membership found." };
  if (subscription.status === "EXPIRED") {
    return { success: false, error: "Your membership has expired — contact support to reactivate." };
  }

  const newPlan = await prisma.membershipPlan.findFirst({
    where: { id: newPlanId, organizationId: actor.organizationId, isActive: true },
  });
  if (!newPlan) return { success: false, error: "Plan not found." };
  if (newPlan.id === subscription.planId) return { success: false, error: "You're already on this plan." };

  const eventType = newPlan.priceCents >= subscription.plan.priceCents ? "UPGRADED" : "DOWNGRADED";

  await prisma.memberSubscription.update({
    where: { id: subscription.id },
    data: { planId: newPlan.id },
  });

  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: eventType === "UPGRADED" ? "membership.upgraded" : "membership.downgraded",
    entityType: "member_subscription",
    entityId: subscription.id,
    before: { planId: subscription.planId, planName: subscription.plan.name },
    after: { planId: newPlan.id, planName: newPlan.name },
  });

  await logMembershipLifecycleEvent({
    organizationId: actor.organizationId,
    memberId: actor.id,
    type: eventType,
    fromPlanId: subscription.planId,
    toPlanId: newPlan.id,
  });

  revalidatePath("/profile");
  revalidatePath("/settings");
  return { success: true };
}
