-- CreateEnum
CREATE TYPE "RevenueChannel" AS ENUM ('BRAND_DEALS', 'TIKTOK_SHOP', 'ONLINE_STORE', 'AFFILIATE', 'UGC_PROJECTS', 'REFERRALS', 'OTHER');

-- AlterTable
ALTER TABLE "gmv_transactions" ADD COLUMN     "channel" "RevenueChannel" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "syncSource" TEXT;

-- CreateTable
CREATE TABLE "revenue_goals" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "annualGoalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "revenue_goals_memberId_key" ON "revenue_goals"("memberId");

-- CreateIndex
CREATE INDEX "gmv_transactions_channel_idx" ON "gmv_transactions"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "gmv_transactions_syncSource_externalId_key" ON "gmv_transactions"("syncSource", "externalId");

-- AddForeignKey
ALTER TABLE "revenue_goals" ADD CONSTRAINT "revenue_goals_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

