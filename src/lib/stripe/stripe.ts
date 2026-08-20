import "server-only";

import Stripe from "stripe";

/**
 * The one Stripe client for the whole app — every Stripe API call (customer
 * creation, Checkout, Billing Portal, subscription updates, webhook
 * verification) goes through this file rather than constructing a Stripe
 * instance ad hoc. Deliberately reusable beyond membership billing: nothing
 * here is membership-specific, so this same client backs future one-time
 * payments (space bookings), Stripe Connect payouts, refunds, etc. without
 * changes.
 *
 * `STRIPE_SECRET_KEY` is never required to exist — this app runs (and its
 * test suite runs) with no Stripe account configured at all. Same
 * best-effort-null pattern as `getSupabaseAdmin()`/`getEmailFrom()`
 * elsewhere in this codebase: callers use `requireStripe()` and get a clear
 * error instead of the app crashing at import time or silently no-op'ing.
 */
const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe: Stripe | null = secretKey
  ? new Stripe(secretKey, {
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
      appInfo: { name: "CreatorHub360" },
    })
  : null;

export function isStripeConfigured(): boolean {
  return stripe !== null;
}

/** Throws a clear, user-actionable error instead of a null-pointer crash when STRIPE_SECRET_KEY is unset. */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured — set STRIPE_SECRET_KEY to enable billing.");
  }
  return stripe;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Stripe is not configured — set STRIPE_WEBHOOK_SECRET to verify webhook signatures.");
  }
  return secret;
}
