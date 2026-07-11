import "server-only";

import { prisma } from "@/server/prisma";
import { EMBEDDING_MODEL } from "@/server/ai/models";

// Prisma can't read/write the Unsupported `vector` columns, so embeddings are
// written and queried with raw SQL. All statements are still scoped by userId.

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export async function saveJdEmbedding(
  applicationId: string,
  userId: string,
  vector: number[],
  jobDescriptionHash: string,
): Promise<void> {
  const v = toVectorLiteral(vector);
  await prisma.$executeRaw`
    UPDATE "application"
    SET "jdEmbedding" = ${v}::vector,
        "jdEmbeddingHash" = ${jobDescriptionHash},
        "jdEmbeddingModel" = ${EMBEDDING_MODEL}
    WHERE id = ${applicationId} AND "userId" = ${userId}
  `;
}

export async function saveResumeEmbedding(
  resumeId: string,
  userId: string,
  vector: number[],
): Promise<void> {
  const v = toVectorLiteral(vector);
  await prisma.$executeRaw`
    UPDATE "resume_version"
    SET "embedding" = ${v}::vector, "embeddingModel" = ${EMBEDDING_MODEL}
    WHERE id = ${resumeId} AND "userId" = ${userId}
  `;
}

// A single AI rate-limit token buys one call to this, so the batch it feeds
// must be bounded: without a LIMIT, one click could fan out to an unbounded
// number of concurrent embed requests. Newest resumes win — they're the ones
// the user is ranking against — and the rest embed on the next click.
export const MAX_EMBEDDINGS_PER_CALL = 20;

// Vectors from different embedding models don't share a space, so a row
// embedded by an older model needs re-embedding, not just an absent one.
export function getResumesNeedingEmbedding(userId: string) {
  return prisma.$queryRaw<{ id: string; content: string }[]>`
    SELECT id, content FROM "resume_version"
    WHERE "userId" = ${userId}
      AND ("embedding" IS NULL OR "embeddingModel" IS DISTINCT FROM ${EMBEDDING_MODEL})
      AND content IS NOT NULL
      AND length(trim(content)) > 0
    ORDER BY "createdAt" DESC
    LIMIT ${MAX_EMBEDDINGS_PER_CALL}
  `;
}

export type FitScore = { id: string; label: string; score: number };

export const MAX_FIT_SCORES = 20;

// Rank the user's resume versions by cosine similarity to the application's
// stored JD embedding — done entirely in Postgres via pgvector's `<=>`
// (cosine distance) operator. The LIMIT is what lets pgvector's HNSW index
// serve this as an approximate-nearest-neighbour scan; without it Postgres
// must sort every row.
//
// Both sides are pinned to the current embedding model: comparing vectors
// produced by different models yields a confident number that means nothing.
export function getResumeFitScores(applicationId: string, userId: string) {
  return prisma.$queryRaw<FitScore[]>`
    SELECT rv.id, rv.label, 1 - (rv."embedding" <=> a."jdEmbedding") AS score
    FROM "resume_version" rv, "application" a
    WHERE a.id = ${applicationId}
      AND a."userId" = ${userId}
      AND rv."userId" = ${userId}
      AND rv."embedding" IS NOT NULL
      AND a."jdEmbedding" IS NOT NULL
      AND rv."embeddingModel" = ${EMBEDDING_MODEL}
      AND a."jdEmbeddingModel" = ${EMBEDDING_MODEL}
    ORDER BY rv."embedding" <=> a."jdEmbedding"
    LIMIT ${MAX_FIT_SCORES}
  `;
}
