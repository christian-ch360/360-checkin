"use server";

import { requireCurrentMember } from "@/features/auth/services/current-member";
import { requireStripe, isStripeConfigured } from "@/lib/stripe/stripe";
import {
  getOrCreateStripeCustomer,
  getAppUrl,
  sanitizeReturnPath,
  resolveCheckoutPlan,
} from "@/features/members/services/stripe-billing.service";

export type StripeSessionResult = { success: true; url: string } | { success: false; error: string };

const DEFAULT_RETURN_PATH = "/profile?tab=membership";

/**
 * Begins (or switches to) paid Stripe billing for the authenticated
 * member's own membership — Checkout Session in subscription mode. Never
 * activates anything locally: the browser landing on the success URL is
 * just a UX confirmation, the Stripe webhook (customer.subscription.created)
 * is what actually updates MemberSubscription (see stripe-webhook route).
 */
export async function createMembershipCheckoutSessionAction(planId?: string, returnPath?: string): Promise<StripeSessionResult> {
  if (!isStripeConfigured()) {
    return { success: false, error: "Billing isn't configured yet. Contact an admin." };
  }

  const actor = await requireCurrentMember();

  const plan = await resolveCheckoutPlan(actor.organizationId, actor.role, planId, actor.subscription?.planId);
  if (!plan) return { success: false, error: "Plan not found." };
  if (!plan.stripePriceId) {
    return { success: false, error: "This plan isn't available for online checkout yet. Contact an admin." };
  }

  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(actor);
    const stripe = requireStripe();
    const path = sanitizeReturnPath(returnPath, DEFAULT_RETURN_PATH);
    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: actor.id,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}${path}${path.includes("?") ? "&" : "?"}checkout=success`,
      cancel_url: `${appUrl}${path}${path.includes("?") ? "&" : "?"}checkout=cancelled`,
      subscription_data: {
        metadata: { creatorhub360MemberId: actor.id, organizationId: actor.organizationId, planId: plan.id },
      },
      metadata: { creatorhub360MemberId: actor.id, organizationId: actor.organizationId, planId: plan.id },
    });

    if (!session.url) return { success: false, error: "Couldn't start checkout — try again." };
    return { success: true, url: session.url };
  } catch (error) {
    console.error("[stripe] checkout session creation failed", error instanceof Error ? error.message : error);
    return { success: false, error: "Couldn't start checkout — try again." };
  }
}

/**
 * Opens the Stripe Customer Portal for the authenticated member's own
 * Stripe Customer — the customer id always comes from this member's own
 * MemberSubscription row, never from a client-supplied parameter, so a
 * member can never reach another member's billing portal.
 */
export async function createBillingPortalSessionAction(returnPath?: string): Promise<StripeSessionResult> {
  if (!isStripeConfigured()) {
    return { success: false, error: "Billing isn't configured yet. Contact an admin." };
  }

  const actor = await requireCurrentMember();
  const stripeCustomerId = actor.subscription?.paymentProviderCustomerId;
  if (!stripeCustomerId) {
    return { success: false, error: "Set up billing first before managing your payment method." };
  }

  try {
    const stripe = requireStripe();
    const path = sanitizeReturnPath(returnPath, DEFAULT_RETURN_PATH);
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getAppUrl()}${path}`,
    });
    return { success: true, url: session.url };
  } catch (error) {
    console.error("[stripe] billing portal session creation failed", error instanceof Error ? error.message : error);
    return { success: false, error: "Couldn't open the billing portal — try again." };
  }
}
