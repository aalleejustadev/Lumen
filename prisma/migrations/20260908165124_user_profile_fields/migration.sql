-- AlterTable
ALTER TABLE "user" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "urls" TEXT[],
ADD COLUMN     "username" TEXT,
ADD COLUMN     "usernameChangedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");
