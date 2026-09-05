-- CreateEnum
CREATE TYPE "CourseCategory" AS ENUM ('WEB_DEV', 'DESIGN', 'DATA_AI', 'BUSINESS', 'MARKETING', 'FINANCE');

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');

-- CreateTable
CREATE TABLE "course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructorName" TEXT NOT NULL,
    "instructorId" TEXT,
    "category" "CourseCategory" NOT NULL,
    "level" "CourseLevel" NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "listPriceCents" INTEGER NOT NULL,
    "thumbnailUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_slug_key" ON "course"("slug");

-- CreateIndex
CREATE INDEX "course_category_idx" ON "course"("category");

-- CreateIndex
CREATE INDEX "course_instructorId_idx" ON "course"("instructorId");

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
