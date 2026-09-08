-- AlterTable
ALTER TABLE "user" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_stripeCustomerId_key" ON "user"("stripeCustomerId");
