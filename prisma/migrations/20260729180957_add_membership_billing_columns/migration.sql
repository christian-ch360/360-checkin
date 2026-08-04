-- AlterTable
ALTER TABLE "member_subscriptions" ADD COLUMN     "cancelAt" TIMESTAMP(3),
ADD COLUMN     "externalSubscriptionId" TEXT,
ADD COLUMN     "paymentProviderCustomerId" TEXT;

-- AlterTable
ALTER TABLE "membership_plans" ADD COLUMN     "appliesTo" "MemberRole";
