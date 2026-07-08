import { prisma } from "@/lib/prisma";

// Prisma can't read/write the Unsupported `vector` columns, so embeddings are
// written and queried with raw SQL. All statements are still scoped by userId.

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export async function saveJdEmbedding(
  applicationId: string,
  userId: string,
  vector: number[],
): Promise<void> {
  const v = toVectorLiteral(vector);
  await prisma.$executeRaw`
    UPDATE "application" SET "jdEmbedding" = ${v}::vector
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
    UPDATE "resume_version" SET "embedding" = ${v}::vector
    WHERE id = ${resumeId} AND "userId" = ${userId}
  `;
}

export function getResumesNeedingEmbedding(userId: string) {
  return prisma.$queryRaw<{ id: string; content: string }[]>`
    SELECT id, content FROM "resume_version"
    WHERE "userId" = ${userId}
      AND "embedding" IS NULL
      AND content IS NOT NULL
      AND length(trim(content)) > 0
  `;
}

export type FitScore = { id: string; label: string; score: number };

// Rank the user's resume versions by cosine similarity to the application's
// stored JD embedding — done entirely in Postgres via pgvector's `<=>`
// (cosine distance) operator, which uses the HNSW index.
export function getResumeFitScores(applicationId: string, userId: string) {
  return prisma.$queryRaw<FitScore[]>`
    SELECT rv.id, rv.label, 1 - (rv."embedding" <=> a."jdEmbedding") AS score
    FROM "resume_version" rv, "application" a
    WHERE a.id = ${applicationId}
      AND a."userId" = ${userId}
      AND rv."userId" = ${userId}
      AND rv."embedding" IS NOT NULL
      AND a."jdEmbedding" IS NOT NULL
    ORDER BY rv."embedding" <=> a."jdEmbedding"
  `;
}
