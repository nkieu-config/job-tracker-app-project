-- DropIndex
DROP INDEX "resume_version_embedding_hnsw_idx";

-- CreateTable
CREATE TABLE "rate_limit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("key")
);
