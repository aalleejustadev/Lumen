-- CreateTable
CREATE TABLE "instructor_follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instructor_follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instructor_follow_instructorId_idx" ON "instructor_follow"("instructorId");

-- CreateIndex
CREATE UNIQUE INDEX "instructor_follow_userId_instructorId_key" ON "instructor_follow"("userId", "instructorId");

-- AddForeignKey
ALTER TABLE "instructor_follow" ADD CONSTRAINT "instructor_follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_follow" ADD CONSTRAINT "instructor_follow_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
