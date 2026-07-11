-- Records which model produced each vector. Comparing cosine distance between
-- vectors from different embedding models yields a confident but meaningless
-- number, so every read now pins both sides to the current model.
ALTER TABLE "application" ADD COLUMN "jdEmbeddingModel" TEXT;
ALTER TABLE "resume_version" ADD COLUMN "embeddingModel" TEXT;

-- Every vector that exists today was produced by gemini-embedding-001.
-- Without this backfill they'd all be treated as stale and silently re-embedded
-- at the user's expense on the next fit computation.
UPDATE "application"
  SET "jdEmbeddingModel" = 'gemini-embedding-001'
  WHERE "jdEmbedding" IS NOT NULL;
UPDATE "resume_version"
  SET "embeddingModel" = 'gemini-embedding-001'
  WHERE "embedding" IS NOT NULL;

-- Supports the periodic sweep of expired rows. Better Auth derives its keys
-- from request identity (which includes the client IP), so without a sweep the
-- table grows by one dead row per IP per endpoint, forever.
CREATE INDEX "rate_limit_expiresAt_idx" ON "rate_limit"("expiresAt");

-- schema.prisma cannot declare an hnsw index (the column is Unsupported), so
-- `prisma migrate dev` will try to DROP this again. Keep it, or fit scoring
-- silently falls back to a sequential scan. CI enforces that the newest
-- migration mentioning this index CREATEs it rather than DROPping it.
CREATE INDEX IF NOT EXISTS "resume_version_embedding_hnsw_idx"
  ON "resume_version" USING hnsw ("embedding" vector_cosine_ops);
