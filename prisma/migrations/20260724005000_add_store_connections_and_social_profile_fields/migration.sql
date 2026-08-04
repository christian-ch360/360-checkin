-- CreateEnum
CREATE TYPE "StoreProvider" AS ENUM ('SHOPIFY');

-- CreateEnum
CREATE TYPE "StoreConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- AlterTable
ALTER TABLE "social_connections" ADD COLUMN     "accountType" TEXT,
ADD COLUMN     "followingCount" INTEGER,
ADD COLUMN     "likesCount" INTEGER,
ADD COLUMN     "postCount" INTEGER,
ADD COLUMN     "profileImageUrl" TEXT;

-- CreateTable
CREATE TABLE "store_connections" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "provider" "StoreProvider" NOT NULL,
    "status" "StoreConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "storeName" TEXT,
    "storeDomain" TEXT,
    "externalAccountId" TEXT,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "gmvSyncedCents" INTEGER,
    "commissionSyncedCents" INTEGER,
    "revenueSyncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_connections_memberId_provider_key" ON "store_connections"("memberId", "provider");

-- AddForeignKey
ALTER TABLE "store_connections" ADD CONSTRAINT "store_connections_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

