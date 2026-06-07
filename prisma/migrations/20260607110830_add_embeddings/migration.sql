-- Enable pgvector (idempotent; required by the vector columns below)
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "application" ADD COLUMN     "jdEmbedding" vector(768);

-- AlterTable
ALTER TABLE "resume_version" ADD COLUMN     "embedding" vector(768);

-- Approximate-nearest-neighbour index for cosine-similarity ranking of
-- resume versions against a job-description embedding.
CREATE INDEX "resume_version_embedding_hnsw_idx"
  ON "resume_version" USING hnsw ("embedding" vector_cosine_ops);
