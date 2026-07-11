-- Restore the ANN index that 20260607150607_add_rate_limit dropped by accident.
-- schema.prisma cannot declare an hnsw index (the column is Unsupported), so
-- `prisma migrate dev` will try to DROP this again. Keep it, or fit scoring
-- silently falls back to a sequential scan.
CREATE INDEX IF NOT EXISTS "resume_version_embedding_hnsw_idx"
  ON "resume_version" USING hnsw ("embedding" vector_cosine_ops);

-- Lets computeResumeFit skip re-embedding a job description it already embedded.
ALTER TABLE "application" ADD COLUMN "jdEmbeddingHash" TEXT;
