-- AlterTable
ALTER TABLE "user" ADD COLUMN     "instructorCommunityEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "instructorCourseEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "instructorEarningEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "instructorNotifyAbout" "NotifyAbout" NOT NULL DEFAULT 'DIRECT_MESSAGES',
ADD COLUMN     "instructorStudentEmails" BOOLEAN NOT NULL DEFAULT true;
