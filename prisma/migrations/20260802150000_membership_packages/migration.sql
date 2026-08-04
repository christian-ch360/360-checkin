-- CreateEnum
CREATE TYPE "MembershipFeatureValueType" AS ENUM ('BOOLEAN', 'NUMBER', 'TEXT');

-- CreateEnum
CREATE TYPE "MembershipFeatureResetPeriod" AS ENUM ('NONE', 'DAILY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "MembershipLifecycleEventType" AS ENUM ('SUBSCRIBED', 'TRIAL_CONVERTED', 'UPGRADED', 'DOWNGRADED', 'CANCELED', 'RESUMED', 'EXPIRED', 'PAST_DUE');

-- CreateTable
CREATE TABLE "membership_features" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "valueType" "MembershipFeatureValueType" NOT NULL,
    "resetPeriod" "MembershipFeatureResetPeriod" NOT NULL DEFAULT 'NONE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plan_feature_values" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "featureId" UUID NOT NULL,
    "boolValue" BOOLEAN,
    "numberValue" INTEGER,
    "textValue" TEXT,
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "displayOverride" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plan_feature_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_usage_counters" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "featureId" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_pricing_schedules" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "newPriceCents" INTEGER NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_pricing_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_lifecycle_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "type" "MembershipLifecycleEventType" NOT NULL,
    "fromPlanId" UUID,
    "toPlanId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_features_organizationId_isActive_idx" ON "membership_features"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "membership_features_organizationId_key_key" ON "membership_features"("organizationId", "key");

-- CreateIndex
CREATE INDEX "membership_plan_feature_values_featureId_idx" ON "membership_plan_feature_values"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plan_feature_values_planId_featureId_key" ON "membership_plan_feature_values"("planId", "featureId");

-- CreateIndex
CREATE INDEX "membership_usage_counters_featureId_period_idx" ON "membership_usage_counters"("featureId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "membership_usage_counters_memberId_featureId_period_key" ON "membership_usage_counters"("memberId", "featureId", "period");

-- CreateIndex
CREATE INDEX "membership_pricing_schedules_planId_idx" ON "membership_pricing_schedules"("planId");

-- CreateIndex
CREATE INDEX "membership_pricing_schedules_effectiveAt_appliedAt_idx" ON "membership_pricing_schedules"("effectiveAt", "appliedAt");

-- CreateIndex
CREATE INDEX "membership_lifecycle_events_organizationId_type_createdAt_idx" ON "membership_lifecycle_events"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "membership_lifecycle_events_memberId_idx" ON "membership_lifecycle_events"("memberId");

-- AddForeignKey
ALTER TABLE "membership_features" ADD CONSTRAINT "membership_features_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plan_feature_values" ADD CONSTRAINT "membership_plan_feature_values_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plan_feature_values" ADD CONSTRAINT "membership_plan_feature_values_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "membership_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_usage_counters" ADD CONSTRAINT "membership_usage_counters_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_usage_counters" ADD CONSTRAINT "membership_usage_counters_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "membership_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_pricing_schedules" ADD CONSTRAINT "membership_pricing_schedules_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_pricing_schedules" ADD CONSTRAINT "membership_pricing_schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_lifecycle_events" ADD CONSTRAINT "membership_lifecycle_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_lifecycle_events" ADD CONSTRAINT "membership_lifecycle_events_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_lifecycle_events" ADD CONSTRAINT "membership_lifecycle_events_fromPlanId_fkey" FOREIGN KEY ("fromPlanId") REFERENCES "membership_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_lifecycle_events" ADD CONSTRAINT "membership_lifecycle_events_toPlanId_fkey" FOREIGN KEY ("toPlanId") REFERENCES "membership_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

