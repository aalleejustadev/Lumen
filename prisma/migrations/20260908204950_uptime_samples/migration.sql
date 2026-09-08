-- CreateTable
CREATE TABLE "uptime_sample" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "checksTotal" INTEGER NOT NULL,
    "checksOk" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uptime_sample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uptime_sample_day_key" ON "uptime_sample"("day");
