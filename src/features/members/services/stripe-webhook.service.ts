import "server-only";

import type Stripe from "stripe";
import type { Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireStripe } from "@/lib/stripe/stripe";
import { notifyMembers } from "@/lib/notifications";
import { EmailService } from "@/lib/email/email-service";
import { logMembershipLifecycleEvent } from "@/features/membership-plans/services/membership-lifecycle-log";

type Tx = Prisma.TransactionClient;

const MEMBERSHIP_LINK = "/profile?tab=membership";

/**
 * Deliberate Stripe subscription.status -> CreatorHub360 SubscriptionStatus
 * mapping (Phase 11 of the integration spec) — reuses the existing 5-value
 * enum rather than adding new ones for states this app doesn't need to
 * distinguish yet. Not every non-"active" Stripe state deactivates the
 * member; several map to PAST_DUE specifically because
 * requireActiveMembership() already grants a grace period for that status
 * (see membership-gate.ts) rather than an instant lockout:
 *
 *   trialing            -> TRIALING
 *   active               -> ACTIVE
 *   past_due             -> PAST_DUE   (Stripe is actively retrying)
 *   unpaid               -> PAST_DUE   (retries exhausted but not canceled — same grace period, not a hard lockout)
 *   incomplete           -> PAST_DUE   (first invoice not yet paid, e.g. still finishing 3DS — don't lock out prematurely)
 *   incomplete_expired   -> EXPIRED    (never became active and Stripe gave up — no grace period applies)
 *   canceled             -> CANCELED
 *   paused                -> PAST_DUE   (access paused, not ended — closest existing state; not worth a dedicated enum value for a feature this app doesn't use yet)
 *
 * Any future Stripe status this map doesn't recognize is intentionally
 * ignored (local status left untouched) rather than guessed at.
 */
const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  unpaid: "PAST_DUE",
  incomplete: "PAST_DUE",
  incomplete_expired: "EXPIRED",
  canceled: "CANCELED",
  paused: "PAST_DUE",
};

function toDate(unixSeconds: number | null | undefined): Date | null {
  return typeof unixSeconds === "number" ? new Date(unixSeconds * 1000) : null;
}

function stripeIdOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/**
 * The single place a Stripe Subscription object gets written into
 * MemberSubscription — called from checkout.session.completed (after an
 * explicit retrieve, since that event only carries a subscription id) and
 * directly from customer.subscription.created/updated/deleted (which
 * already carry the full object). Idempotent by construction: re-running it
 * with the same Stripe subscription just writes the same fields again.
 */
async function syncSubscriptionFromStripe(tx: Tx, stripeSub: Stripe.Subscription) {
  const memberId = stripeSub.metadata?.creatorhub360MemberId;
  const customerId = stripeIdOf(stripeSub.customer);

  const local = memberId
    ? await tx.memberSubscription.findUnique({ where: { memberId } })
    : customerId
      ? await tx.memberSubscription.findFirst({ where: { paymentProviderCustomerId: customerId } })
      : null;

  if (!local) {
    console.warn("[stripe webhook] no local MemberSubscription found for subscription", stripeSub.id);
    return;
  }

  const item = stripeSub.items.data[0];
  const priceId = item?.price?.id;
  const plan = priceId ? await tx.membershipPlan.findUnique({ where: { stripePriceId: priceId } }) : null;

  const newStatus = STRIPE_STATUS_MAP[stripeSub.status] ?? local.status;
  const previousStatus = local.status;

  await tx.memberSubscription.update({
    where: { id: local.id },
    data: {
      status: newStatus,
      planId: plan?.id ?? local.planId,
      currentPeriodEnd: toDate(item?.current_period_end) ?? local.currentPeriodEnd,
      cancelAt: toDate(stripeSub.cancel_at),
      canceledAt: toDate(stripeSub.canceled_at),
      paymentProviderCustomerId: customerId ?? local.paymentProviderCustomerId,
      externalSubscriptionId: stripeSub.id,
    },
  });

  if (previousStatus === newStatus) return;

  if (newStatus === "CANCELED") {
    await notifyMembers([local.memberId], {
      type: "MEMBERSHIP_CANCELED",
      title: "Your membership was canceled",
      body: "Your CreatorHub360 membership is now canceled.",
      link: MEMBERSHIP_LINK,
    });
    await logMembershipLifecycleEvent({
      organizationId: (await tx.member.findUniqueOrThrow({ where: { id: local.memberId }, select: { organizationId: true } }))
        .organizationId,
      memberId: local.memberId,
      type: "CANCELED",
      fromPlanId: local.planId,
    });
  } else if (newStatus === "ACTIVE" && previousStatus !== "ACTIVE") {
    await notifyMembers([local.memberId], {
      type: "MEMBERSHIP_RENEWED",
      title: previousStatus === "TRIALING" ? "Your membership is now active" : "Your membership was renewed",
      body: "Your CreatorHub360 membership is active and in good standing.",
      link: MEMBERSHIP_LINK,
    });
    const organizationId = (await tx.member.findUniqueOrThrow({ where: { id: local.memberId }, select: { organizationId: true } }))
      .organizationId;
    await logMembershipLifecycleEvent({
      organizationId,
      memberId: local.memberId,
      type: previousStatus === "TRIALING" ? "TRIAL_CONVERTED" : "SUBSCRIBED",
      fromPlanId: local.planId,
      toPlanId: plan?.id ?? local.planId,
    });
  }
}

async function handleCheckoutSessionCompleted(tx: Tx, session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return; // one-time payments are a future phase (see stripe.ts's reusability note) — no-op today
  const subscriptionId = stripeIdOf(session.subscription);
  if (!subscriptionId) return;

  const stripe = requireStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscriptionFromStripe(tx, subscription);
}

async function findSubscriptionForInvoice(tx: Tx, invoice: Stripe.Invoice) {
  const subscriptionRef = invoice.parent?.type === "subscription_details" ? invoice.parent.subscription_details?.subscription : null;
  const subscriptionId = stripeIdOf(subscriptionRef ?? null);
  const customerId = stripeIdOf(invoice.customer);

  if (subscriptionId) {
    const bySubscription = await tx.memberSubscription.findFirst({ where: { externalSubscriptionId: subscriptionId } });
    if (bySubscription) return bySubscription;
  }
  if (customerId) {
    return tx.memberSubscription.findFirst({ where: { paymentProviderCustomerId: customerId } });
  }
  return null;
}

async function handleInvoicePaid(tx: Tx, invoice: Stripe.Invoice) {
  const subscription = await findSubscriptionForInvoice(tx, invoice);
  if (!subscription) {
    console.warn("[stripe webhook] invoice.paid — no local subscription found for invoice", invoice.id);
    return;
  }
  const customerId = stripeIdOf(invoice.customer);

  await tx.membershipPayment.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      memberSubscriptionId: subscription.id,
      amountCents: invoice.amount_paid,
      currency: invoice.currency,
      status: "PAID",
      stripeInvoiceId: invoice.id ?? null,
      stripeCustomerId: customerId,
      paidAt: toDate(invoice.status_transitions.paid_at) ?? new Date(),
    },
    update: {
      status: "PAID",
      amountCents: invoice.amount_paid,
      paidAt: toDate(invoice.status_transitions.paid_at) ?? new Date(),
    },
  });

  const member = await tx.member.findUniqueOrThrow({ where: { id: subscription.memberId } });
  await notifyMembers([subscription.memberId], {
    type: "PAYMENT_SUCCEEDED",
    title: "Payment received",
    body: `We received your payment of ${(invoice.amount_paid / 100).toLocaleString("en-US", { style: "currency", currency: invoice.currency.toUpperCase() })}.`,
    link: MEMBERSHIP_LINK,
  });
  void member; // reserved for a future payment-receipt email (Phase 22 — one-time payments/receipts); no dedicated template exists yet, so only the in-app notification fires today.
}

async function handleInvoicePaymentFailed(tx: Tx, invoice: Stripe.Invoice) {
  const subscription = await findSubscriptionForInvoice(tx, invoice);
  if (!subscription) {
    console.warn("[stripe webhook] invoice.payment_failed — no local subscription found for invoice", invoice.id);
    return;
  }
  const customerId = stripeIdOf(invoice.customer);

  await tx.membershipPayment.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      memberSubscriptionId: subscription.id,
      amountCents: invoice.amount_due,
      currency: invoice.currency,
      status: "FAILED",
      stripeInvoiceId: invoice.id ?? null,
      stripeCustomerId: customerId,
      paidAt: new Date(), // "attempted at," not a real payment date — FAILED rows never actually paid.
    },
    update: { status: "FAILED", amountCents: invoice.amount_due },
  });

  const [member, plan] = await Promise.all([
    tx.member.findUniqueOrThrow({ where: { id: subscription.memberId } }),
    tx.membershipPlan.findUniqueOrThrow({ where: { id: subscription.planId } }),
  ]);

  await notifyMembers([subscription.memberId], {
    type: "PAYMENT_FAILED",
    title: "Payment issue",
    body: "Your payment method needs attention. Update it to keep your membership active.",
    link: MEMBERSHIP_LINK,
  });

  // Member-facing transactional email — never an internal admin email (see
  // Phase 12: "do not send internal admin emails unless there is an
  // existing business requirement" — there isn't one for this event).
  await EmailService.sendPaymentFailedEmail({
    to: member.email,
    fullName: member.fullName,
    planName: plan.name,
    supportEmail: process.env.SUPPORT_EMAIL ?? "support@creatorhub360.com",
    organizationId: member.organizationId,
    memberId: member.id,
    priority: "critical",
  });
}

async function handleInvoicePaymentActionRequired(tx: Tx, invoice: Stripe.Invoice) {
  const subscription = await findSubscriptionForInvoice(tx, invoice);
  if (!subscription) return;
  const customerId = stripeIdOf(invoice.customer);

  await tx.membershipPayment.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      memberSubscriptionId: subscription.id,
      amountCents: invoice.amount_due,
      currency: invoice.currency,
      status: "PENDING",
      stripeInvoiceId: invoice.id ?? null,
      stripeCustomerId: customerId,
      paidAt: new Date(),
    },
    update: { status: "PENDING", amountCents: invoice.amount_due },
  });

  await notifyMembers([subscription.memberId], {
    type: "PAYMENT_ACTION_REQUIRED",
    title: "Action needed to complete your payment",
    body: "Your bank requires additional verification to complete this payment. Update your payment method to continue.",
    link: MEMBERSHIP_LINK,
  });
}

const EVENT_HANDLERS: Partial<Record<Stripe.Event["type"], (tx: Tx, event: Stripe.Event) => Promise<void>>> = {
  "checkout.session.completed": (tx, event) => handleCheckoutSessionCompleted(tx, event.data.object as Stripe.Checkout.Session),
  "customer.subscription.created": (tx, event) => syncSubscriptionFromStripe(tx, event.data.object as Stripe.Subscription),
  "customer.subscription.updated": (tx, event) => syncSubscriptionFromStripe(tx, event.data.object as Stripe.Subscription),
  "customer.subscription.deleted": (tx, event) => syncSubscriptionFromStripe(tx, event.data.object as Stripe.Subscription),
  "invoice.paid": (tx, event) => handleInvoicePaid(tx, event.data.object as Stripe.Invoice),
  "invoice.payment_failed": (tx, event) => handleInvoicePaymentFailed(tx, event.data.object as Stripe.Invoice),
  "invoice.payment_action_required": (tx, event) => handleInvoicePaymentActionRequired(tx, event.data.object as Stripe.Invoice),
};

export type WebhookProcessResult = { handled: boolean; alreadyProcessed: boolean };

/**
 * Idempotent Stripe event processor — the dedupe insert and every DB write
 * an event triggers happen inside one transaction. A retried delivery of
 * the same event.id hits the unique constraint on `stripeEventId` and is
 * recognized as already-handled (no reprocessing, no duplicate
 * payment/notification/lifecycle records). If a handler throws for any
 * other reason, the whole transaction — including the dedupe insert —
 * rolls back, so Stripe's retry can reprocess a genuine failure cleanly
 * rather than that event being permanently (and wrongly) marked handled.
 *
 * The signature itself is verified by the caller (the webhook route) before
 * this function ever runs — see /api/stripe/webhook/route.ts.
 */
export async function processStripeWebhookEvent(event: Stripe.Event): Promise<WebhookProcessResult> {
  const handler = EVENT_HANDLERS[event.type];

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.stripeWebhookEvent.create({ data: { stripeEventId: event.id, type: event.type } });
        if (handler) await handler(tx, event);
      },
      { timeout: 15000 }
    );
    return { handled: Boolean(handler), alreadyProcessed: false };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { handled: false, alreadyProcessed: true };
    }
    throw error;
  }
}
