import "server-only";

import type { Member, MemberRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireStripe } from "@/lib/stripe/stripe";

/**
 * Server-side-only plan resolution — the client can pass a `planId`, but it
 * is always re-validated here against the member's own organization/role
 * before it's ever allowed to touch Stripe. The client can never submit an
 * arbitrary Stripe price id; only `plan.stripePriceId`, a value this server
 * looked up itself, is ever passed to Stripe. A `planId` for a different
 * organization, a disabled plan, or a plan that doesn't apply to this
 * member's role all resolve to `null` here — never silently falls back to
 * "whatever the client asked for." Mirrors changeMembershipPlan's exact
 * plan-lookup guard (src/features/members/services/membership-actions.ts).
 */
export async function resolveCheckoutPlan(
  organizationId: string,
  role: MemberRole,
  requestedPlanId: string | undefined,
  currentPlanId: string | undefined
) {
  const targetPlanId = requestedPlanId ?? currentPlanId;
  if (!targetPlanId) return null;

  return prisma.membershipPlan.findFirst({
    where: {
      id: targetPlanId,
      organizationId,
      isActive: true,
      OR: [{ appliesTo: role }, { appliesTo: null }],
    },
  });
}

/**
 * Resolves this member's Stripe Customer, creating one only the first time
 * they actually enter a paid flow (Checkout or the Billing Portal) — never
 * called speculatively for every member, so existing members are never
 * silently turned into Stripe customers or charged (see Phase 6 of the
 * integration spec this file implements).
 *
 * Identification is always by CreatorHub360's own `memberId`, carried as
 * Stripe customer metadata — never by email alone, since emails can change
 * (see changeEmail()) and Stripe customer email is not a reliable join key.
 */
export async function getOrCreateStripeCustomer(member: Pick<Member, "id" | "organizationId" | "fullName" | "email">): Promise<string> {
  const stripe = requireStripe();

  const subscription = await prisma.memberSubscription.findUnique({
    where: { memberId: member.id },
    select: { id: true, paymentProviderCustomerId: true },
  });
  if (!subscription) {
    throw new Error("This member has no membership subscription to attach billing to.");
  }
  if (subscription.paymentProviderCustomerId) {
    return subscription.paymentProviderCustomerId;
  }

  const customer = await stripe.customers.create({
    name: member.fullName,
    email: member.email,
    metadata: {
      creatorhub360MemberId: member.id,
      organizationId: member.organizationId,
    },
  });

  await prisma.memberSubscription.update({
    where: { id: subscription.id },
    data: { paymentProviderCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Live, display-only summary of a Stripe customer's default card — brand +
 * last4 only, exactly what Stripe itself treats as non-sensitive (never the
 * PAN, never CVC). Fetched fresh from Stripe on render rather than cached
 * locally, per the integration's "Stripe remains responsible for payment
 * credentials" rule — CreatorHub360 never persists anything about the card
 * itself, not even brand/last4.
 */
export async function getDefaultPaymentMethodSummary(
  stripeCustomerId: string
): Promise<{ brand: string; last4: string } | null> {
  const stripe = requireStripe();

  const customer = await stripe.customers.retrieve(stripeCustomerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  if (customer.deleted) return null;

  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (defaultPm && typeof defaultPm !== "string" && defaultPm.card) {
    return { brand: defaultPm.card.brand, last4: defaultPm.card.last4 };
  }

  // No default set explicitly — fall back to the customer's first saved card.
  const paymentMethods = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: "card", limit: 1 });
  const first = paymentMethods.data[0];
  return first?.card ? { brand: first.card.brand, last4: first.card.last4 } : null;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** Only ever redirect back to a known, internal, relative path — never an open redirect to an attacker-supplied URL. */
export function sanitizeReturnPath(path: string | undefined, fallback: string): string {
  if (path && path.startsWith("/") && !path.startsWith("//")) return path;
  return fallback;
}
