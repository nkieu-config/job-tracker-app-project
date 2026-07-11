-- Attribute AI cost per user. Nullable because historical rows predate it and
-- can't be backfilled — the identity was never recorded.
ALTER TABLE "ai_usage" ADD COLUMN "userId" TEXT;
CREATE INDEX "ai_usage_userId_idx" ON "ai_usage"("userId");

-- The single-column index is a redundant left-prefix of ("userId", "status");
-- it only adds write amplification.
DROP INDEX IF EXISTS "application_userId_idx";
