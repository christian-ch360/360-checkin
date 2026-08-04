-- DropIndex
DROP INDEX "notifications_memberId_idx";

-- DropIndex
DROP INDEX "notifications_readAt_idx";

-- CreateIndex
CREATE INDEX "notifications_memberId_createdAt_idx" ON "notifications"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_memberId_readAt_idx" ON "notifications"("memberId", "readAt");

