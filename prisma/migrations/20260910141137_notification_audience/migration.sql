-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('LEARNER', 'ADMIN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationCategory" ADD VALUE 'MEMBERS';
ALTER TYPE "NotificationCategory" ADD VALUE 'SECURITY';

-- DropIndex
DROP INDEX "notification_userId_createdAt_idx";

-- DropIndex
DROP INDEX "notification_userId_readAt_idx";

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "audience" "NotificationAudience" NOT NULL DEFAULT 'LEARNER';

-- CreateIndex
CREATE INDEX "notification_userId_audience_createdAt_idx" ON "notification"("userId", "audience", "createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_audience_readAt_idx" ON "notification"("userId", "audience", "readAt");

