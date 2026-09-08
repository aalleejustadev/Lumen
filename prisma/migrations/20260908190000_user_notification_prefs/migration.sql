-- CreateEnum
CREATE TYPE "NotifyAbout" AS ENUM ('ALL_ACTIVITY', 'DIRECT_MESSAGES', 'NOTHING');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "communityEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "courseEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyAbout" "NotifyAbout" NOT NULL DEFAULT 'DIRECT_MESSAGES',
ADD COLUMN     "securityEmails" BOOLEAN NOT NULL DEFAULT true;
