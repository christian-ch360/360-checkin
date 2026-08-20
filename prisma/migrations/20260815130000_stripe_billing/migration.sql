-- Stripe billing infrastructure. Purely additive — every new column is
-- nullable or has a safe default, so no existing MembershipPlan,
-- MemberSubscription, or MembershipPayment row changes meaning. No existing
-- member is charged, migrated to Stripe, or has their status altered by
-- this migration; a member only gets Stripe IDs once they explicitly go
-- through Checkout.

-- MembershipPlan: which Stripe recurring Price a plan checks out through.
-- Null until a Super Admin links the plan in the Stripe Dashboard.
ALTER TABLE "public"."membership_plans" ADD COLUMN "stripePriceId" TEXT;
CREATE UNIQUE INDEX "membership_plans_stripePriceId_key" ON "public"."membership_plans"("stripePriceId");

-- MemberSubscription: the two columns already reserved for this
-- ("paymentProviderCustomerId"/"externalSubscriptionId") just gain unique
-- constraints — one Stripe customer/subscription maps to exactly one
-- CreatorHub360 member.
CREATE UNIQUE INDEX "member_subscriptions_paymentProviderCustomerId_key" ON "public"."member_subscriptions"("paymentProviderCustomerId");
CREATE UNIQUE INDEX "member_subscriptions_externalSubscriptionId_key" ON "public"."member_subscriptions"("externalSubscriptionId");

-- MembershipPayment: Stripe references + a real payment-state enum. Every
-- existing row (all created by the manual admin "record a payment" flow)
-- backfills to status = PAID (their pre-existing implicit meaning) with the
-- new Stripe columns left null.
CREATE TYPE "public"."MembershipPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELED');

ALTER TABLE "public"."membership_payments" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'usd';
ALTER TABLE "public"."membership_payments" ADD COLUMN "status" "public"."MembershipPaymentStatus" NOT NULL DEFAULT 'PAID';
ALTER TABLE "public"."membership_payments" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "public"."membership_payments" ADD COLUMN "stripeInvoiceId" TEXT;
ALTER TABLE "public"."membership_payments" ADD COLUMN "stripeCustomerId" TEXT;

CREATE UNIQUE INDEX "membership_payments_stripePaymentIntentId_key" ON "public"."membership_payments"("stripePaymentIntentId");
CREATE UNIQUE INDEX "membership_payments_stripeInvoiceId_key" ON "public"."membership_payments"("stripeInvoiceId");
CREATE INDEX "membership_payments_stripeCustomerId_idx" ON "public"."membership_payments"("stripeCustomerId");

-- Webhook idempotency guard — one row per verified Stripe event, inserted
-- inside the same transaction as the DB writes that event triggers.
CREATE TABLE "public"."stripe_webhook_events" (
    "id" UUID NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_webhook_events_stripeEventId_key" ON "public"."stripe_webhook_events"("stripeEventId");

-- Billing-related in-app notification types (see src/lib/notifications.ts) —
-- this event class previously only triggered emails, never a Notification row.
ALTER TYPE "public"."NotificationType" ADD VALUE 'PAYMENT_SUCCEEDED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PAYMENT_ACTION_REQUIRED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'MEMBERSHIP_CANCELED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'MEMBERSHIP_RENEWED';
