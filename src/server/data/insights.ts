import "server-only";

import { prisma } from "@/server/prisma";
import { EMBEDDING_MODEL } from "@/server/ai/models";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { storedJdAnalysisSchema } from "@/lib/schemas/jd-analysis";
import { zeroRecord } from "@/lib/records";
import {
  bucketByWeek,
  formatWeekLabel,
  startOfWeekUtc,
  WEEK_MS,
} from "@/lib/chart";
import {
  buildPipelineSnapshot,
  type AnalyzedApplication,
  type PipelineSnapshot,
} from "@/lib/insights";

// Every query here is scoped by userId — the same authorization boundary the
// rest of the data layer enforces.

export const ACTIVITY_WEEKS = 12;

export type WeeklyActivity = {
  weekStart: string;
  label: string;
  counts: Record<ApplicationStatus, number>;
  total: number;
};

export async function getWeeklyActivity(
  userId: string,
  now: Date = new Date(),
): Promise<WeeklyActivity[]> {
  const currentWeekStart = startOfWeekUtc(now).getTime();
  const firstWeekStart = new Date(
    currentWeekStart - (ACTIVITY_WEEKS - 1) * WEEK_MS,
  );

  const rows = await prisma.application.findMany({
    where: { userId, createdAt: { gte: firstWeekStart } },
    select: { createdAt: true, status: true },
  });

  return bucketByWeek(rows, (row) => row.createdAt, ACTIVITY_WEEKS, now).map(
    (bucket) => {
      const counts = zeroRecord(APPLICATION_STATUSES);
      for (const row of bucket.items) counts[row.status] += 1;
      return {
        weekStart: bucket.start.toISOString(),
        label: formatWeekLabel(bucket.start),
        counts,
        total: bucket.items.length,
      };
    },
  );
}

// The whole pipeline, reduced to the aggregate the dashboard's skill-gap card
// and the AI coach both read. Stored analyses are re-validated here — an old or
// hand-edited `analysis` JSON that no longer matches the schema is dropped
// rather than trusted, so a malformed row can't skew the aggregate.
export async function getPipelineSnapshot(
  userId: string,
): Promise<PipelineSnapshot> {
  const rows = await prisma.application.findMany({
    where: { userId },
    select: { status: true, analysis: true },
  });

  const applications: AnalyzedApplication[] = rows.map((row) => {
    const parsed = storedJdAnalysisSchema.safeParse(row.analysis);
    return { status: row.status, analysis: parsed.success ? parsed.data : null };
  });

  return buildPipelineSnapshot(applications);
}

export type ApplicationFit = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  score: number;
};

export const MAX_FIT_POINTS = 100;

// Best resume match per application: the highest cosine similarity between the
// application's JD embedding and any of the user's resume embeddings, computed
// entirely in Postgres via pgvector's `<=>` operator. Both sides are pinned to
// the current embedding model — vectors from different models don't share a
// space, so mixing them yields a confident number that means nothing. Only
// applications that already have an embedding contribute; the rest are absent,
// not zero, so an unanalysed JD never reads as a bad match.
export function getBestFitPerApplication(userId: string) {
  return prisma.$queryRaw<ApplicationFit[]>`
    SELECT a.id, a.company, a.role, a.status,
           MAX(1 - (rv."embedding" <=> a."jdEmbedding")) AS score
    FROM "application" a
    JOIN "resume_version" rv ON rv."userId" = a."userId"
    WHERE a."userId" = ${userId}
      AND a."jdEmbedding" IS NOT NULL
      AND rv."embedding" IS NOT NULL
      AND a."jdEmbeddingModel" = ${EMBEDDING_MODEL}
      AND rv."embeddingModel" = ${EMBEDDING_MODEL}
    GROUP BY a.id, a.company, a.role, a.status
    ORDER BY score DESC
    LIMIT ${MAX_FIT_POINTS}
  `;
}
