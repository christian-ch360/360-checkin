import { NextResponse } from "next/server";
import { isStripeConfigured, requireStripe, getStripeWebhookSecret } from "@/lib/stripe/stripe";
import { processStripeWebhookEvent } from "@/features/members/services/stripe-webhook.service";

/**
 * Stripe posts every subscription/invoice/checkout event here. Same
 * raw-body-then-verify pattern as the existing DocuSign webhook (see
 * /api/webhooks/docusign/route.ts): the body is read as text and handed to
 * Stripe's own signature verification untouched — never parsed as JSON
 * first, since that would change the exact bytes the signature was computed
 * over and make every event look tampered with.
 *
 * Production endpoint: https://[your-domain]/api/stripe/webhook — register
 * this exact path in the Stripe Dashboard (see .env.example for the events
 * to subscribe to).
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe-Signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    const stripe = requireStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (error) {
    console.error("[stripe webhook] signature verification failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const result = await processStripeWebhookEvent(event);
    return NextResponse.json({ received: true, alreadyProcessed: result.alreadyProcessed });
  } catch (error) {
    // A non-2xx response tells Stripe to retry — exactly what we want for a
    // genuine processing failure (the transaction rolled back, so nothing
    // was partially applied; see stripe-webhook.service.ts).
    console.error("[stripe webhook] event processing failed", event.type, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
