-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'NEEDS_CHANGES', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubmissionDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChangeReason" AS ENUM ('AUDIO_VIDEO_QUALITY', 'INCOMPLETE_CURRICULUM', 'MISSING_QUIZ_OR_PROJECT', 'CONTENT_ACCURACY', 'COPYRIGHT_CONCERN');

-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('PURCHASE', 'BUSINESS_PLAN', 'COUPON', 'ADMIN_GRANT', 'FREE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN_PENDING_APPEAL', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('REVIEW', 'DISCUSSION', 'DISCUSSION_REPLY', 'COURSE_QUESTION', 'USER');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'ABUSIVE', 'SPOILERS', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REMOVED', 'DISMISSED', 'HIDDEN_PENDING_APPEAL');

-- CreateEnum
CREATE TYPE "TopicVisibility" AS ENUM ('EVERYONE', 'ENROLLED_ONLY', 'STAFF_ONLY');

-- CreateEnum
CREATE TYPE "DiscussionStatus" AS ENUM ('PUBLISHED', 'PENDING_APPROVAL', 'REMOVED');

-- CreateEnum
CREATE TYPE "LikeTargetType" AS ENUM ('DISCUSSION', 'DISCUSSION_REPLY');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('COURSE', 'MESSAGE', 'COMMUNITY', 'CERTIFICATE', 'BILLING');

-- CreateEnum
CREATE TYPE "NotificationActionState" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'UNPAID', 'PAUSED');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "PromotionDiscountType" AS ENUM ('PERCENT', 'FIXED_PRICE');

-- CreateEnum
CREATE TYPE "PromotionScope" AS ENUM ('ALL_COURSES', 'CATEGORIES');

-- CreateEnum
CREATE TYPE "EarningSource" AS ENUM ('SALE', 'BUSINESS_WATCH', 'ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayoutMethodType" AS ENUM ('BANK_TRANSFER', 'PAYPAL');

-- CreateEnum
CREATE TYPE "PayoutMethodRole" AS ENUM ('PRIMARY', 'BACKUP');

-- CreateEnum
CREATE TYPE "PayoutRunStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('MEMBERS', 'COURSES', 'BILLING', 'SECURITY');

-- CreateEnum
CREATE TYPE "HelpAudience" AS ENUM ('STUDENT', 'INSTRUCTOR', 'BOTH');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MediaOwnerType" AS ENUM ('LESSON_VIDEO', 'LESSON_RESOURCE', 'MESSAGE_ATTACHMENT', 'CERTIFICATE_PDF', 'COURSE_COVER');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';

-- DropIndex
DROP INDEX "course_category_idx";

-- AlterTable
ALTER TABLE "cart_item" ADD COLUMN     "courseId" TEXT;

-- AlterTable
ALTER TABLE "course" DROP COLUMN "category",
DROP COLUMN "published",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "congratulationsMessage" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'usd',
ADD COLUMN     "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "includedInBusiness" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "intendedAudience" TEXT,
ADD COLUMN     "lessonCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promotionOptIn" BOOLEAN,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "totalDurationMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "welcomeMessage" TEXT;

-- AlterTable
ALTER TABLE "course_lesson" ADD COLUMN     "articleBody" TEXT,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "videoAssetId" TEXT;

-- AlterTable
ALTER TABLE "course_review" DROP COLUMN "authorImageUrl",
DROP COLUMN "authorName",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "enrollmentId" TEXT,
ADD COLUMN     "reportCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN     "title" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "instructor" ADD COLUMN     "emailPayoutReceipt" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minimumPayoutCents" INTEGER NOT NULL DEFAULT 10000,
ADD COLUMN     "payoutDayOfMonth" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "promotionOptIn" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "couponId" TEXT,
ADD COLUMN     "discountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promotionId" TEXT,
ADD COLUMN     "subtotalCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order_item" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "instructorId" TEXT,
ADD COLUMN     "revenueShareBps" INTEGER;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "country" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "wishlist_item" ADD COLUMN     "courseId" TEXT;

-- DropEnum
DROP TYPE "CourseCategory";

-- CreateTable
CREATE TABLE "user_invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "country" TEXT,
    "plan" TEXT,
    "token" TEXT NOT NULL,
    "sendEmail" BOOLEAN NOT NULL DEFAULT true,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "acceptedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructor_application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pitch" TEXT NOT NULL,
    "portfolioUrls" TEXT[],
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instructor_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT 'blue',
    "showInNav" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_submission" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "SubmissionDecision",
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "changeReasons" "ChangeReason"[],
    "noteToInstructor" TEXT,

    CONSTRAINT "course_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_submission_check" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "automated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "course_submission_check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "source" "EnrollmentSource" NOT NULL DEFAULT 'PURCHASE',
    "orderId" TEXT,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "currentLessonId" TEXT,
    "lastAccessedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "secondsWatched" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "timestampSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_day" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "minutesWatched" INTEGER NOT NULL DEFAULT 0,
    "minutesReading" INTEGER NOT NULL DEFAULT 0,
    "minutesQuizzing" INTEGER NOT NULL DEFAULT 0,
    "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "learning_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT 'green',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_path_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_module" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "learning_path_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_learning_path" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "completedModules" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "user_learning_path_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passPercent" INTEGER NOT NULL DEFAULT 70,
    "retakesAllowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_question" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "quiz_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_option" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "quiz_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempt" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "scorePercent" INTEGER,
    "correctCount" INTEGER,
    "passed" BOOLEAN,

    CONSTRAINT "quiz_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_answer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,

    CONSTRAINT "quiz_answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "publicSlug" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "grade" TEXT,
    "scorePercent" INTEGER,
    "pdfStorageKey" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_review_reply" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_review_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT,
    "reason" "ReportReason" NOT NULL,
    "note" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT 'blue',
    "visibility" "TopicVisibility" NOT NULL DEFAULT 'EVERYONE',
    "learnersCanStartThreads" BOOLEAN NOT NULL DEFAULT true,
    "requiresModeratorApproval" BOOLEAN NOT NULL DEFAULT false,
    "courseId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_moderator" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canPin" BOOLEAN NOT NULL DEFAULT true,
    "canLock" BOOLEAN NOT NULL DEFAULT true,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "canSuspend" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_moderator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "status" "DiscussionStatus" NOT NULL DEFAULT 'PUBLISHED',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_reply" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "discussion_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "LikeTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_question" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "answeredByInstructor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "course_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_question_reply" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "course_question_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_question_vote" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_question_vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "announcementId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "conversation_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "courseId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "actorId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_action" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payload" JSONB,
    "state" "NotificationActionState" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "notification_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stripeRefundId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'business',
    "status" "SubscriptionStatus" NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "resultingPriceCents" INTEGER NOT NULL,
    "redemptionLimit" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" "PromotionDiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "scope" "PromotionScope" NOT NULL DEFAULT 'ALL_COURSES',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "forceOnAllCourses" BOOLEAN NOT NULL DEFAULT false,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "revenueCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructor_earning" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "courseId" TEXT,
    "source" "EarningSource" NOT NULL DEFAULT 'SALE',
    "orderItemId" TEXT,
    "grossCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "clearsAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instructor_earning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_method" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "type" "PayoutMethodType" NOT NULL,
    "label" TEXT NOT NULL,
    "last4" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "role" "PayoutMethodRole" NOT NULL DEFAULT 'BACKUP',
    "externalRef" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_run" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "PayoutRunStatus" NOT NULL DEFAULT 'SCHEDULED',
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "payoutRunId" TEXT,
    "instructorId" TEXT NOT NULL,
    "payoutMethodId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_time_rollup" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "period" DATE NOT NULL,
    "minutesWatched" INTEGER NOT NULL DEFAULT 0,
    "uniqueLearners" INTEGER NOT NULL DEFAULT 0,
    "poolShareCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_time_rollup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_setting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT 'violet',
    "websiteTitle" TEXT NOT NULL DEFAULT 'Lumen — Learn anything, teach everything',
    "metaDescription" TEXT NOT NULL DEFAULT 'Learn from 12,000 expert-led courses, or build and sell your own. One platform for both sides of the classroom — start free today.',
    "instructorApplicationsOpen" BOOLEAN NOT NULL DEFAULT true,
    "newStudentSignupsOpen" BOOLEAN NOT NULL DEFAULT true,
    "requireManualCourseReview" BOOLEAN NOT NULL DEFAULT true,
    "autoEnrollNewCoursesInPromotions" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "defaultRevenueShareBps" INTEGER NOT NULL DEFAULT 7000,
    "supportEmail" TEXT NOT NULL DEFAULT 'support@lumen.co',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "category" "AuditCategory" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "audience" "HelpAudience" NOT NULL DEFAULT 'BOTH',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "help_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readMinutes" INTEGER NOT NULL DEFAULT 3,
    "categoryId" TEXT NOT NULL,
    "audience" "HelpAudience" NOT NULL DEFAULT 'BOTH',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "audience" "HelpAudience" NOT NULL DEFAULT 'BOTH',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "help_faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_asset" (
    "id" TEXT NOT NULL,
    "ownerType" "MediaOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PromotionCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PromotionCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RelatedArticles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RelatedArticles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_invitation_token_key" ON "user_invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitation_acceptedUserId_key" ON "user_invitation"("acceptedUserId");

-- CreateIndex
CREATE INDEX "user_invitation_email_idx" ON "user_invitation"("email");

-- CreateIndex
CREATE INDEX "user_invitation_status_idx" ON "user_invitation"("status");

-- CreateIndex
CREATE INDEX "instructor_application_userId_idx" ON "instructor_application"("userId");

-- CreateIndex
CREATE INDEX "instructor_application_status_idx" ON "instructor_application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "category_parentId_idx" ON "category"("parentId");

-- CreateIndex
CREATE INDEX "course_submission_courseId_idx" ON "course_submission"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_submission_check_submissionId_key_key" ON "course_submission_check"("submissionId", "key");

-- CreateIndex
CREATE INDEX "enrollment_courseId_idx" ON "enrollment"("courseId");

-- CreateIndex
CREATE INDEX "enrollment_userId_idx" ON "enrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_userId_courseId_key" ON "enrollment"("userId", "courseId");

-- CreateIndex
CREATE INDEX "lesson_progress_lessonId_idx" ON "lesson_progress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_enrollmentId_lessonId_key" ON "lesson_progress"("enrollmentId", "lessonId");

-- CreateIndex
CREATE INDEX "lesson_note_userId_lessonId_idx" ON "lesson_note"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_day_userId_date_key" ON "learning_day"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_slug_key" ON "learning_path"("slug");

-- CreateIndex
CREATE INDEX "learning_path_module_learningPathId_idx" ON "learning_path_module"("learningPathId");

-- CreateIndex
CREATE INDEX "learning_path_module_courseId_idx" ON "learning_path_module"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "user_learning_path_userId_learningPathId_key" ON "user_learning_path"("userId", "learningPathId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_lessonId_key" ON "quiz"("lessonId");

-- CreateIndex
CREATE INDEX "quiz_question_quizId_idx" ON "quiz_question"("quizId");

-- CreateIndex
CREATE INDEX "quiz_option_questionId_idx" ON "quiz_option"("questionId");

-- CreateIndex
CREATE INDEX "quiz_attempt_enrollmentId_idx" ON "quiz_attempt"("enrollmentId");

-- CreateIndex
CREATE INDEX "quiz_attempt_quizId_idx" ON "quiz_attempt"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_answer_attemptId_questionId_key" ON "quiz_answer"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_serial_key" ON "certificate"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_publicSlug_key" ON "certificate"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_enrollmentId_key" ON "certificate"("enrollmentId");

-- CreateIndex
CREATE INDEX "certificate_userId_idx" ON "certificate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "course_review_reply_reviewId_key" ON "course_review_reply"("reviewId");

-- CreateIndex
CREATE INDEX "content_report_status_idx" ON "content_report"("status");

-- CreateIndex
CREATE INDEX "content_report_targetType_targetId_idx" ON "content_report"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "community_topic_slug_key" ON "community_topic"("slug");

-- CreateIndex
CREATE INDEX "topic_moderator_userId_idx" ON "topic_moderator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_moderator_topicId_userId_key" ON "topic_moderator"("topicId", "userId");

-- CreateIndex
CREATE INDEX "discussion_topicId_idx" ON "discussion"("topicId");

-- CreateIndex
CREATE INDEX "discussion_courseId_idx" ON "discussion"("courseId");

-- CreateIndex
CREATE INDEX "discussion_reply_discussionId_idx" ON "discussion_reply"("discussionId");

-- CreateIndex
CREATE INDEX "discussion_like_targetType_targetId_idx" ON "discussion_like"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_like_userId_targetType_targetId_key" ON "discussion_like"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "course_question_courseId_idx" ON "course_question"("courseId");

-- CreateIndex
CREATE INDEX "course_question_lessonId_idx" ON "course_question"("lessonId");

-- CreateIndex
CREATE INDEX "course_question_reply_questionId_idx" ON "course_question_reply"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "course_question_vote_questionId_userId_key" ON "course_question_vote"("questionId", "userId");

-- CreateIndex
CREATE INDEX "conversation_lastMessageAt_idx" ON "conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "conversation_participant_userId_idx" ON "conversation_participant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participant_conversationId_userId_key" ON "conversation_participant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "message_conversationId_sentAt_idx" ON "message"("conversationId", "sentAt");

-- CreateIndex
CREATE INDEX "announcement_authorId_idx" ON "announcement"("authorId");

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_action_notificationId_key" ON "notification_action"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "refund_stripeRefundId_key" ON "refund"("stripeRefundId");

-- CreateIndex
CREATE INDEX "refund_orderId_idx" ON "refund"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripeSubscriptionId_key" ON "subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscription_userId_status_idx" ON "subscription"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_code_key" ON "coupon"("code");

-- CreateIndex
CREATE INDEX "coupon_courseId_idx" ON "coupon"("courseId");

-- CreateIndex
CREATE INDEX "coupon_instructorId_idx" ON "coupon"("instructorId");

-- CreateIndex
CREATE INDEX "coupon_redemption_couponId_idx" ON "coupon_redemption"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemption_couponId_orderId_key" ON "coupon_redemption"("couponId", "orderId");

-- CreateIndex
CREATE INDEX "promotion_startsAt_endsAt_idx" ON "promotion"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "instructor_earning_instructorId_status_idx" ON "instructor_earning"("instructorId", "status");

-- CreateIndex
CREATE INDEX "instructor_earning_payoutId_idx" ON "instructor_earning"("payoutId");

-- CreateIndex
CREATE INDEX "payout_method_instructorId_idx" ON "payout_method"("instructorId");

-- CreateIndex
CREATE UNIQUE INDEX "payout_run_reference_key" ON "payout_run"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "payout_reference_key" ON "payout"("reference");

-- CreateIndex
CREATE INDEX "payout_instructorId_idx" ON "payout"("instructorId");

-- CreateIndex
CREATE INDEX "payout_payoutRunId_idx" ON "payout"("payoutRunId");

-- CreateIndex
CREATE INDEX "watch_time_rollup_period_idx" ON "watch_time_rollup"("period");

-- CreateIndex
CREATE UNIQUE INDEX "watch_time_rollup_instructorId_courseId_period_key" ON "watch_time_rollup"("instructorId", "courseId", "period");

-- CreateIndex
CREATE INDEX "audit_log_category_createdAt_idx" ON "audit_log"("category", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "help_category_slug_key" ON "help_category"("slug");

-- CreateIndex
CREATE INDEX "help_category_audience_idx" ON "help_category"("audience");

-- CreateIndex
CREATE UNIQUE INDEX "help_article_slug_key" ON "help_article"("slug");

-- CreateIndex
CREATE INDEX "help_article_categoryId_idx" ON "help_article"("categoryId");

-- CreateIndex
CREATE INDEX "help_faq_audience_idx" ON "help_faq"("audience");

-- CreateIndex
CREATE INDEX "support_ticket_status_idx" ON "support_ticket"("status");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_storageKey_key" ON "media_asset"("storageKey");

-- CreateIndex
CREATE INDEX "media_asset_ownerType_ownerId_idx" ON "media_asset"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "_PromotionCategories_B_index" ON "_PromotionCategories"("B");

-- CreateIndex
CREATE INDEX "_RelatedArticles_B_index" ON "_RelatedArticles"("B");

-- CreateIndex
CREATE INDEX "course_categoryId_idx" ON "course"("categoryId");

-- CreateIndex
CREATE INDEX "course_status_idx" ON "course"("status");

-- CreateIndex
CREATE UNIQUE INDEX "course_review_courseId_userId_key" ON "course_review"("courseId", "userId");

-- CreateIndex
CREATE INDEX "user_status_idx" ON "user"("status");

-- AddForeignKey
ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_application" ADD CONSTRAINT "instructor_application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_application" ADD CONSTRAINT "instructor_application_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_submission" ADD CONSTRAINT "course_submission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_submission" ADD CONSTRAINT "course_submission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_submission" ADD CONSTRAINT "course_submission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_submission_check" ADD CONSTRAINT "course_submission_check_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "course_submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "course_lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_note" ADD CONSTRAINT "lesson_note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_note" ADD CONSTRAINT "lesson_note_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "course_lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_day" ADD CONSTRAINT "learning_day_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_module" ADD CONSTRAINT "learning_path_module_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "learning_path"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_module" ADD CONSTRAINT "learning_path_module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learning_path" ADD CONSTRAINT "user_learning_path_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learning_path" ADD CONSTRAINT "user_learning_path_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "learning_path"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "course_lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_option" ADD CONSTRAINT "quiz_option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answer" ADD CONSTRAINT "quiz_answer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "quiz_attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answer" ADD CONSTRAINT "quiz_answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answer" ADD CONSTRAINT "quiz_answer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "quiz_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_review" ADD CONSTRAINT "course_review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_review" ADD CONSTRAINT "course_review_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_review_reply" ADD CONSTRAINT "course_review_reply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "course_review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_review_reply" ADD CONSTRAINT "course_review_reply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_topic" ADD CONSTRAINT "community_topic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_moderator" ADD CONSTRAINT "topic_moderator_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "community_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_moderator" ADD CONSTRAINT "topic_moderator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion" ADD CONSTRAINT "discussion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "community_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion" ADD CONSTRAINT "discussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion" ADD CONSTRAINT "discussion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reply" ADD CONSTRAINT "discussion_reply_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reply" ADD CONSTRAINT "discussion_reply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reply" ADD CONSTRAINT "discussion_reply_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "discussion_reply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_like" ADD CONSTRAINT "discussion_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_question" ADD CONSTRAINT "course_question_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_question" ADD CONSTRAINT "course_question_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "course_lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_question" ADD CONSTRAINT "course_question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_question_reply" ADD CONSTRAINT "course_question_reply_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "course_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_question_reply" ADD CONSTRAINT "course_question_reply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_question_vote" ADD CONSTRAINT "course_question_vote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "course_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_question_vote" ADD CONSTRAINT "course_question_vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_action" ADD CONSTRAINT "notification_action_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_earning" ADD CONSTRAINT "instructor_earning_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_earning" ADD CONSTRAINT "instructor_earning_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_earning" ADD CONSTRAINT "instructor_earning_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_earning" ADD CONSTRAINT "instructor_earning_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_method" ADD CONSTRAINT "payout_method_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout" ADD CONSTRAINT "payout_payoutRunId_fkey" FOREIGN KEY ("payoutRunId") REFERENCES "payout_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout" ADD CONSTRAINT "payout_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout" ADD CONSTRAINT "payout_payoutMethodId_fkey" FOREIGN KEY ("payoutMethodId") REFERENCES "payout_method"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_time_rollup" ADD CONSTRAINT "watch_time_rollup_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_time_rollup" ADD CONSTRAINT "watch_time_rollup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_article" ADD CONSTRAINT "help_article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "help_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromotionCategories" ADD CONSTRAINT "_PromotionCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromotionCategories" ADD CONSTRAINT "_PromotionCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedArticles" ADD CONSTRAINT "_RelatedArticles_A_fkey" FOREIGN KEY ("A") REFERENCES "help_article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedArticles" ADD CONSTRAINT "_RelatedArticles_B_fkey" FOREIGN KEY ("B") REFERENCES "help_article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
