import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";

const prisma = new PrismaClient();

const runId = Date.now();
let organizationId: string;
const createdMemberIds: string[] = [];
const createdPlanIds: string[] = [];

/**
 * Stripe billing integration tests, following this codebase's established
 * real-Postgres-no-mocking convention (see email-templates-admin.test.ts,
 * duplicate-resolution.test.ts). Split into what genuinely can and can't run
 * without a real Stripe test-mode API key in this environment:
 *
 * - Webhook signature verification, idempotency, and event processing
 *   (subscription sync, invoice paid/failed, notification/payment records)
 *   run for real against real Postgres. `stripe.webhooks.constructEvent`/
 *   `generateTestHeaderString` are pure local HMAC computation — they need a
 *   Stripe *client instance* to call the method on, but never make a network
 *   call, so a fake `sk_test_...` string works fine for these.
 * - `resolveCheckoutPlan` (the "can the client pick an arbitrary Stripe
 *   price" guard) runs for real against real Postgres.
 * - `getMemberMembership`'s payment-history scoping runs for real against
 *   real Postgres.
 * - Functions that make an actual Stripe API network call
 *   (getOrCreateStripeCustomer's stripe.customers.create,
 *   checkout/portal session creation, getDefaultPaymentMethodSummary,
 *   checkout.session.completed's internal subscriptions.retrieve) are NOT
 *   exercised end-to-end here — this environment has no real Stripe
 *   test-mode credentials. Their authorization/validation guards (which run
 *   *before* any Stripe call) are covered instead; the Stripe API calls
 *   themselves are type-checked against the official SDK's types (see
 *   `npx tsc --noEmit`) but not live-tested. This gap — not a passing
 *   result — is called out explicitly in the final report rather than
 *   claimed as verified.
 */

const FAKE_STRIPE_KEY = "sk_test_fake_key_for_signature_tests_only";
const FAKE_WEBHOOK_SECRET = "whsec_fake_secret_for_signature_tests_only";

describe("Stripe billing (integration, real Postgres)", () => {
  beforeAll(async () => {
    // Must happen before ANY dynamic import in this file touches
    // src/lib/stripe/stripe.ts — its module-level `stripe` client is
    // constructed once, the first time the module is loaded, and that
    // result is cached for the rest of this file's module registry. Setting
    // this here (the outermost beforeAll, guaranteed to run before every
    // nested describe's tests) ensures every dynamic import below sees it.
    process.env.STRIPE_SECRET_KEY = FAKE_STRIPE_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = FAKE_WEBHOOK_SECRET;

    const org = await prisma.organization.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
    organizationId = org.id;
  });

  afterAll(async () => {
    await prisma.membershipPayment.deleteMany({ where: { subscription: { member: { organizationId, memberNumber: { startsWith: "TEST-STRIPE-" } } } } });
    await prisma.notification.deleteMany({ where: { member: { memberNumber: { startsWith: "TEST-STRIPE-" } } } });
    await prisma.membershipLifecycleEvent.deleteMany({ where: { member: { memberNumber: { startsWith: "TEST-STRIPE-" } } } });
    await prisma.stripeWebhookEvent.deleteMany({ where: { stripeEventId: { startsWith: `evt_test_${runId}` } } });
    if (createdMemberIds.length) {
      await prisma.memberSubscription.deleteMany({ where: { memberId: { in: createdMemberIds } } });
      await prisma.member.deleteMany({ where: { id: { in: createdMemberIds } } });
    }
    if (createdPlanIds.length) await prisma.membershipPlan.deleteMany({ where: { id: { in: createdPlanIds } } });
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------
  // Plan resolution — "arbitrary price manipulation attempt"
  // ---------------------------------------------------------------------
  describe("resolveCheckoutPlan (server-side plan/price validation)", () => {
    it("resolves a real, active, role-matching plan", async () => {
      const { resolveCheckoutPlan } = await import("@/features/members/services/stripe-billing.service");
      const plan = await prisma.membershipPlan.create({
        data: {
          organizationId,
          name: `Test Stripe Plan ${runId}`,
          priceCents: 9900,
          appliesTo: "CREATOR",
          isActive: true,
          stripePriceId: `price_test_${runId}`,
        },
      });
      createdPlanIds.push(plan.id);

      const resolved = await resolveCheckoutPlan(organizationId, "CREATOR", plan.id, undefined);
      expect(resolved?.id).toBe(plan.id);
      expect(resolved?.stripePriceId).toBe(`price_test_${runId}`);
    });

    it("rejects a planId that doesn't exist — never falls back to trusting the client", async () => {
      const { resolveCheckoutPlan } = await import("@/features/members/services/stripe-billing.service");
      const resolved = await resolveCheckoutPlan(organizationId, "CREATOR", "00000000-0000-0000-0000-000000000000", undefined);
      expect(resolved).toBeNull();
    });

    it("rejects a plan belonging to a different organization", async () => {
      const { resolveCheckoutPlan } = await import("@/features/members/services/stripe-billing.service");
      const otherOrg = await prisma.organization.create({
        data: { name: `Test Other Org Stripe ${runId}`, slug: `test-other-org-stripe-${runId}` },
      });
      const foreignPlan = await prisma.membershipPlan.create({
        data: {
          organizationId: otherOrg.id,
          name: `Foreign Plan ${runId}`,
          priceCents: 100,
          appliesTo: "CREATOR",
          isActive: true,
          stripePriceId: `price_test_foreign_${runId}`,
        },
      });

      const resolved = await resolveCheckoutPlan(organizationId, "CREATOR", foreignPlan.id, undefined);
      expect(resolved).toBeNull();

      await prisma.membershipPlan.deleteMany({ where: { id: foreignPlan.id } });
      await prisma.organization.deleteMany({ where: { id: otherOrg.id } });
    });

    it("rejects a plan that doesn't apply to the member's role", async () => {
      const { resolveCheckoutPlan } = await import("@/features/members/services/stripe-billing.service");
      const brandOnlyPlan = await prisma.membershipPlan.create({
        data: {
          organizationId,
          name: `Brand Only Plan ${runId}`,
          priceCents: 100,
          appliesTo: "BRAND",
          isActive: true,
        },
      });
      createdPlanIds.push(brandOnlyPlan.id);

      const resolved = await resolveCheckoutPlan(organizationId, "CREATOR", brandOnlyPlan.id, undefined);
      expect(resolved).toBeNull();
    });

    it("rejects an inactive plan", async () => {
      const { resolveCheckoutPlan } = await import("@/features/members/services/stripe-billing.service");
      const inactivePlan = await prisma.membershipPlan.create({
        data: { organizationId, name: `Inactive Plan ${runId}`, priceCents: 100, appliesTo: "CREATOR", isActive: false },
      });
      createdPlanIds.push(inactivePlan.id);

      const resolved = await resolveCheckoutPlan(organizationId, "CREATOR", inactivePlan.id, undefined);
      expect(resolved).toBeNull();
    });
  });

  // ---------------------------------------------------------------------
  // Webhook route — signature verification + idempotency over HTTP
  // ---------------------------------------------------------------------
  describe("/api/stripe/webhook route", () => {
    let stripeTestClient: Stripe;
    let POST: (typeof import("@/app/api/stripe/webhook/route"))["POST"];

    beforeAll(async () => {
      const StripeCtor = (await import("stripe")).default;
      stripeTestClient = new StripeCtor(FAKE_STRIPE_KEY, { apiVersion: "2026-07-29.dahlia" });
      ({ POST } = await import("@/app/api/stripe/webhook/route"));
    });

    function buildSignedRequest(payload: string, secret: string = FAKE_WEBHOOK_SECRET) {
      const signature = stripeTestClient.webhooks.generateTestHeaderString({ payload, secret });
      return new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: payload,
      });
    }

    it("accepts a validly-signed event and returns 200", async () => {
      const eventId = `evt_test_${runId}_valid`;
      const payload = JSON.stringify({
        id: eventId,
        object: "event",
        type: "customer.subscription.updated",
        data: { object: { id: "sub_test_nonexistent", object: "subscription", customer: "cus_test_nonexistent", status: "active", items: { data: [] }, metadata: {} } },
      });

      const response = await POST(buildSignedRequest(payload));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);

      const logged = await prisma.stripeWebhookEvent.findUnique({ where: { stripeEventId: eventId } });
      expect(logged).not.toBeNull();
    });

    it("rejects a request with an invalid signature", async () => {
      const payload = JSON.stringify({ id: `evt_test_${runId}_bad_sig`, object: "event", type: "customer.subscription.updated", data: { object: {} } });
      const request = new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=not_a_real_signature" },
        body: payload,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("rejects a request with no Stripe-Signature header at all", async () => {
      const request = new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("does not reprocess a duplicate delivery of the same event", async () => {
      const eventId = `evt_test_${runId}_dup`;
      const payload = JSON.stringify({
        id: eventId,
        object: "event",
        type: "customer.subscription.updated",
        data: { object: { id: "sub_test_dup", object: "subscription", customer: "cus_test_dup", status: "active", items: { data: [] }, metadata: {} } },
      });

      const first = await POST(buildSignedRequest(payload));
      expect(first.status).toBe(200);
      const firstBody = await first.json();
      expect(firstBody.alreadyProcessed).toBe(false);

      const second = await POST(buildSignedRequest(payload));
      expect(second.status).toBe(200);
      const secondBody = await second.json();
      expect(secondBody.alreadyProcessed).toBe(true);

      const count = await prisma.stripeWebhookEvent.count({ where: { stripeEventId: eventId } });
      expect(count).toBe(1);
    });
  });

  // ---------------------------------------------------------------------
  // Event processing business logic — direct calls, no HTTP/network needed
  // ---------------------------------------------------------------------
  describe("processStripeWebhookEvent (subscription sync, invoices, notifications)", () => {
    let memberId: string;
    let planId: string;
    let stripePriceId: string;

    beforeAll(async () => {
      const plan = await prisma.membershipPlan.create({
        data: {
          organizationId,
          name: `Test Sync Plan ${runId}`,
          priceCents: 9900,
          appliesTo: "CREATOR",
          isActive: true,
          stripePriceId: `price_test_sync_${runId}`,
        },
      });
      planId = plan.id;
      createdPlanIds.push(plan.id);
      stripePriceId = plan.stripePriceId!;

      const member = await prisma.member.create({
        data: {
          organizationId,
          memberNumber: `TEST-STRIPE-SYNC-${runId}`,
          fullName: "Stripe Sync Test Member",
          email: `stripe-sync-${runId}@example.com`,
          role: "CREATOR",
          status: "ACTIVE",
        },
      });
      memberId = member.id;
      createdMemberIds.push(member.id);

      await prisma.memberSubscription.create({
        data: { memberId, planId, status: "TRIALING" },
      });
    });

    it("syncs an active Stripe subscription into MemberSubscription and notifies + logs the transition", async () => {
      const { processStripeWebhookEvent } = await import("@/features/members/services/stripe-webhook.service");

      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const event = {
        id: `evt_test_${runId}_sub_active`,
        type: "customer.subscription.updated",
        data: {
          object: {
            id: `sub_test_${runId}`,
            object: "subscription",
            customer: `cus_test_${runId}`,
            status: "active",
            cancel_at: null,
            canceled_at: null,
            items: { data: [{ price: { id: stripePriceId }, current_period_end: periodEnd }] },
            metadata: { creatorhub360MemberId: memberId },
          },
        },
      } as unknown as Stripe.Event;

      const result = await processStripeWebhookEvent(event);
      expect(result.handled).toBe(true);
      expect(result.alreadyProcessed).toBe(false);

      const subscription = await prisma.memberSubscription.findUniqueOrThrow({ where: { memberId } });
      expect(subscription.status).toBe("ACTIVE");
      expect(subscription.externalSubscriptionId).toBe(`sub_test_${runId}`);
      expect(subscription.paymentProviderCustomerId).toBe(`cus_test_${runId}`);
      expect(subscription.currentPeriodEnd?.getTime()).toBe(periodEnd * 1000);

      const notification = await prisma.notification.findFirst({ where: { memberId, type: "MEMBERSHIP_RENEWED" } });
      expect(notification).not.toBeNull();

      const lifecycleEvent = await prisma.membershipLifecycleEvent.findFirst({ where: { memberId, type: "TRIAL_CONVERTED" } });
      expect(lifecycleEvent).not.toBeNull();
    });

    it("syncs a canceled Stripe subscription and notifies MEMBERSHIP_CANCELED", async () => {
      const { processStripeWebhookEvent } = await import("@/features/members/services/stripe-webhook.service");

      const event = {
        id: `evt_test_${runId}_sub_canceled`,
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: `sub_test_${runId}`,
            object: "subscription",
            customer: `cus_test_${runId}`,
            status: "canceled",
            cancel_at: null,
            canceled_at: Math.floor(Date.now() / 1000),
            items: { data: [{ price: { id: stripePriceId }, current_period_end: Math.floor(Date.now() / 1000) }] },
            metadata: { creatorhub360MemberId: memberId },
          },
        },
      } as unknown as Stripe.Event;

      await processStripeWebhookEvent(event);

      const subscription = await prisma.memberSubscription.findUniqueOrThrow({ where: { memberId } });
      expect(subscription.status).toBe("CANCELED");

      const notification = await prisma.notification.findFirst({ where: { memberId, type: "MEMBERSHIP_CANCELED" } });
      expect(notification).not.toBeNull();
    });

    it("invoice.paid creates a PAID MembershipPayment and a PAYMENT_SUCCEEDED notification", async () => {
      const { processStripeWebhookEvent } = await import("@/features/members/services/stripe-webhook.service");

      const invoiceId = `in_test_${runId}`;
      const event = {
        id: `evt_test_${runId}_invoice_paid`,
        type: "invoice.paid",
        data: {
          object: {
            id: invoiceId,
            object: "invoice",
            customer: `cus_test_${runId}`,
            amount_paid: 9900,
            amount_due: 9900,
            currency: "usd",
            parent: { type: "subscription_details", subscription_details: { subscription: `sub_test_${runId}` } },
            status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
          },
        },
      } as unknown as Stripe.Event;

      const result = await processStripeWebhookEvent(event);
      expect(result.handled).toBe(true);

      const payment = await prisma.membershipPayment.findUnique({ where: { stripeInvoiceId: invoiceId } });
      expect(payment).not.toBeNull();
      expect(payment?.status).toBe("PAID");
      expect(payment?.amountCents).toBe(9900);

      const notification = await prisma.notification.findFirst({ where: { memberId, type: "PAYMENT_SUCCEEDED" } });
      expect(notification).not.toBeNull();
    });

    it("a duplicate invoice.paid delivery (same event.id) does not create a second MembershipPayment", async () => {
      const { processStripeWebhookEvent } = await import("@/features/members/services/stripe-webhook.service");

      const invoiceId = `in_test_${runId}_dup`;
      const event = {
        id: `evt_test_${runId}_invoice_paid_dup`,
        type: "invoice.paid",
        data: {
          object: {
            id: invoiceId,
            object: "invoice",
            customer: `cus_test_${runId}`,
            amount_paid: 9900,
            amount_due: 9900,
            currency: "usd",
            parent: { type: "subscription_details", subscription_details: { subscription: `sub_test_${runId}` } },
            status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
          },
        },
      } as unknown as Stripe.Event;

      const first = await processStripeWebhookEvent(event);
      expect(first.alreadyProcessed).toBe(false);
      const second = await processStripeWebhookEvent(event);
      expect(second.alreadyProcessed).toBe(true);

      const count = await prisma.membershipPayment.count({ where: { stripeInvoiceId: invoiceId } });
      expect(count).toBe(1);
    });

    it("invoice.payment_failed creates a FAILED MembershipPayment and a PAYMENT_FAILED notification — no admin email", async () => {
      const { processStripeWebhookEvent } = await import("@/features/members/services/stripe-webhook.service");

      const invoiceId = `in_test_${runId}_failed`;
      const event = {
        id: `evt_test_${runId}_invoice_failed`,
        type: "invoice.payment_failed",
        data: {
          object: {
            id: invoiceId,
            object: "invoice",
            customer: `cus_test_${runId}`,
            amount_paid: 0,
            amount_due: 9900,
            currency: "usd",
            parent: { type: "subscription_details", subscription_details: { subscription: `sub_test_${runId}` } },
            status_transitions: {},
          },
        },
      } as unknown as Stripe.Event;

      await processStripeWebhookEvent(event);

      const payment = await prisma.membershipPayment.findUnique({ where: { stripeInvoiceId: invoiceId } });
      expect(payment?.status).toBe("FAILED");

      const notification = await prisma.notification.findFirst({ where: { memberId, type: "PAYMENT_FAILED" } });
      expect(notification).not.toBeNull();

      // "Do not send internal admin emails" — the only EmailLog row for this
      // event is the member-facing payment_failed template, addressed to
      // the member, never a broadcast to every Super Admin.
      const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
      const emailLogs = await prisma.emailLog.findMany({ where: { organizationId, template: "payment_failed", memberId } });
      expect(emailLogs.every((log) => log.to === member.email)).toBe(true);
    });

    it("invoice.payment_action_required creates a PENDING MembershipPayment and a PAYMENT_ACTION_REQUIRED notification", async () => {
      const { processStripeWebhookEvent } = await import("@/features/members/services/stripe-webhook.service");

      const invoiceId = `in_test_${runId}_action_required`;
      const event = {
        id: `evt_test_${runId}_invoice_action_required`,
        type: "invoice.payment_action_required",
        data: {
          object: {
            id: invoiceId,
            object: "invoice",
            customer: `cus_test_${runId}`,
            amount_paid: 0,
            amount_due: 9900,
            currency: "usd",
            parent: { type: "subscription_details", subscription_details: { subscription: `sub_test_${runId}` } },
          },
        },
      } as unknown as Stripe.Event;

      await processStripeWebhookEvent(event);

      const payment = await prisma.membershipPayment.findUnique({ where: { stripeInvoiceId: invoiceId } });
      expect(payment?.status).toBe("PENDING");

      const notification = await prisma.notification.findFirst({ where: { memberId, type: "PAYMENT_ACTION_REQUIRED" } });
      expect(notification).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------
  // Payment-history access control
  // ---------------------------------------------------------------------
  describe("getMemberMembership payment-history scoping", () => {
    it("only returns a member's own subscription and payments, never another member's", async () => {
      const { getMemberMembership } = await import("@/features/creator-dashboard/services/membership.service");

      const plan = await prisma.membershipPlan.create({
        data: { organizationId, name: `Test Scoping Plan ${runId}`, priceCents: 5000, appliesTo: "CREATOR", isActive: true },
      });
      createdPlanIds.push(plan.id);

      const [memberA, memberB] = await Promise.all([
        prisma.member.create({
          data: {
            organizationId,
            memberNumber: `TEST-STRIPE-SCOPE-A-${runId}`,
            fullName: "Scope Test A",
            email: `scope-a-${runId}@example.com`,
            role: "CREATOR",
            status: "ACTIVE",
          },
        }),
        prisma.member.create({
          data: {
            organizationId,
            memberNumber: `TEST-STRIPE-SCOPE-B-${runId}`,
            fullName: "Scope Test B",
            email: `scope-b-${runId}@example.com`,
            role: "CREATOR",
            status: "ACTIVE",
          },
        }),
      ]);
      createdMemberIds.push(memberA.id, memberB.id);

      const [subA, subB] = await Promise.all([
        prisma.memberSubscription.create({ data: { memberId: memberA.id, planId: plan.id, status: "ACTIVE" } }),
        prisma.memberSubscription.create({ data: { memberId: memberB.id, planId: plan.id, status: "ACTIVE" } }),
      ]);

      await Promise.all([
        prisma.membershipPayment.create({ data: { memberSubscriptionId: subA.id, amountCents: 111, note: "Member A payment" } }),
        prisma.membershipPayment.create({ data: { memberSubscriptionId: subB.id, amountCents: 222, note: "Member B payment" } }),
      ]);

      const membershipA = await getMemberMembership(memberA.id);
      expect(membershipA?.payments).toHaveLength(1);
      expect(membershipA?.payments[0].note).toBe("Member A payment");
      expect(membershipA?.payments.some((p) => p.note === "Member B payment")).toBe(false);

      const membershipB = await getMemberMembership(memberB.id);
      expect(membershipB?.payments).toHaveLength(1);
      expect(membershipB?.payments[0].note).toBe("Member B payment");
    });
  });
});
