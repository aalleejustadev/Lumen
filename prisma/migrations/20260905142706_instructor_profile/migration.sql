-- AlterTable
ALTER TABLE "instructor" ADD COLUMN     "about" TEXT[],
ADD COLUMN     "skills" TEXT[],
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "instructor_slug_key" ON "instructor"("slug");
