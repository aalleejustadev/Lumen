-- CreateEnum
CREATE TYPE "AdminNotifyAbout" AS ENUM ('ALL_ACTIVITY', 'NEEDS_ACTION', 'NOTHING');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "adminApplicationEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "adminCourseReviewEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "adminNotifyAbout" "AdminNotifyAbout" NOT NULL DEFAULT 'NEEDS_ACTION',
ADD COLUMN     "adminPayoutEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "adminReportEmails" BOOLEAN NOT NULL DEFAULT true;
