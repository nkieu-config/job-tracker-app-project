-- AlterTable
ALTER TABLE "application" ADD COLUMN     "analysis" JSONB,
ADD COLUMN     "analyzedAt" TIMESTAMP(3);
