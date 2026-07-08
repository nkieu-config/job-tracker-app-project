-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED');

-- CreateTable
CREATE TABLE "application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SAVED',
    "jobDescription" TEXT,
    "jobUrl" TEXT,
    "deadline" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_version" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fileUrl" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_userId_idx" ON "application"("userId");

-- CreateIndex
CREATE INDEX "application_userId_status_idx" ON "application"("userId", "status");

-- CreateIndex
CREATE INDEX "resume_version_userId_idx" ON "resume_version"("userId");

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_version" ADD CONSTRAINT "resume_version_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
