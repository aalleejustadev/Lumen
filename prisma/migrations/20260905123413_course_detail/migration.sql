-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'ARTICLE', 'QUIZ', 'PRACTICE');

-- DropForeignKey
ALTER TABLE "course" DROP CONSTRAINT "course_instructorId_fkey";

-- AlterTable
ALTER TABLE "course" DROP COLUMN "instructorName",
ADD COLUMN     "articlesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT[],
ADD COLUMN     "hasCertificate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hasDownloadableResources" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "learningOutcomes" TEXT[],
ADD COLUMN     "lifetimeAccess" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quizzesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requirements" TEXT[],
ADD COLUMN     "saleEndsAt" TIMESTAMP(3),
ADD COLUMN     "subtitle" TEXT NOT NULL,
ADD COLUMN     "videoHours" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "instructorId" SET NOT NULL;

-- CreateTable
CREATE TABLE "instructor" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "imageUrl" TEXT,
    "teachingSince" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "studentsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_section" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "course_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_lesson" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "LessonType" NOT NULL,
    "durationMinutes" INTEGER,
    "questionsCount" INTEGER,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "course_lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_review" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorImageUrl" TEXT,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instructor_userId_key" ON "instructor"("userId");

-- CreateIndex
CREATE INDEX "course_section_courseId_idx" ON "course_section"("courseId");

-- CreateIndex
CREATE INDEX "course_lesson_sectionId_idx" ON "course_lesson"("sectionId");

-- CreateIndex
CREATE INDEX "course_review_courseId_idx" ON "course_review"("courseId");

-- AddForeignKey
ALTER TABLE "instructor" ADD CONSTRAINT "instructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_section" ADD CONSTRAINT "course_section_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_lesson" ADD CONSTRAINT "course_lesson_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "course_section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_review" ADD CONSTRAINT "course_review_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
