import "server-only";

import { cache } from "react";
import { prisma } from "@/server/prisma";
import {
  type ApplicationInput,
  type ApplicationMutation,
  type ApplicationStatus,
  type ApplicationSort,
} from "@/lib/schemas/application";
import type { StoredJdAnalysis } from "@/lib/schemas/jd-analysis";
import type { AgendaRow } from "@/lib/agenda";

// Every query is scoped by userId — a user can only ever read their own
// applications. This is the real authorization boundary (alongside the
// session check), not the proxy.

export const MAX_APPLICATIONS = 500;

export function countApplications(userId: string) {
  return prisma.application.count({ where: { userId } });
}

// The board and list views render only these five columns. Selecting them
// explicitly keeps the JD, the analysis JSON, and the tailored/interview text
// (which run to several KB per row) out of a query that can return 500 rows.
const APPLICATION_LIST_FIELDS = {
  id: true,
  role: true,
  company: true,
  status: true,
  deadline: true,
} as const;

export function getApplications(
  userId: string,
  options: {
    status?: ApplicationStatus;
    query?: string;
    sort?: ApplicationSort;
  } = {},
) {
  const { status, query, sort = "newest" } = options;
  return prisma.application.findMany({
    take: MAX_APPLICATIONS,
    select: APPLICATION_LIST_FIELDS,
    where: {
      userId,
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { company: { contains: query, mode: "insensitive" as const } },
              { role: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy:
      sort === "deadline"
        ? [
            { deadline: { sort: "asc" as const, nulls: "last" as const } },
            { createdAt: "desc" as const },
          ]
        : sort === "company"
          ? [{ company: "asc" as const }, { createdAt: "desc" as const }]
          : [{ createdAt: "desc" as const }],
  });
}

export const getApplication = cache((id: string, userId: string) => {
  return prisma.application.findFirst({ where: { id, userId } });
});

export function getUpcomingDeadlines(userId: string, limit = 5) {
  const startOfTodayUtc = new Date(new Date().toISOString().slice(0, 10));
  return prisma.application.findMany({
    select: APPLICATION_LIST_FIELDS,
    where: {
      userId,
      deadline: { gte: startOfTodayUtc },
      status: { not: "REJECTED" },
    },
    orderBy: { deadline: "asc" },
    take: limit,
  });
}

// Just enough of each application to find it by typing: no job descriptions, no
// analyses, no prep sheets.
export function getApplicationIndex(userId: string, limit = MAX_APPLICATIONS) {
  return prisma.application.findMany({
    where: { userId },
    select: { id: true, role: true, company: true, status: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

// The agenda only needs to know *whether* a posting, an analysis and a prep
// sheet exist, so the booleans are computed in Postgres. Selecting the columns
// themselves would drag every job description and prep sheet across the wire to
// answer a question about their emptiness.
export function getAgendaRows(userId: string, limit = 60) {
  return prisma.$queryRaw<AgendaRow[]>`
    SELECT
      id,
      role,
      company,
      status::text AS status,
      deadline,
      ("jobDescription" IS NOT NULL AND btrim("jobDescription") <> '') AS "hasJd",
      ("analyzedAt" IS NOT NULL) AS analyzed,
      ("interviewPrep" IS NOT NULL AND btrim("interviewPrep") <> '') AS "hasPrep",
      "updatedAt"
    FROM "application"
    WHERE "userId" = ${userId}
      AND status <> 'REJECTED'
    ORDER BY deadline ASC NULLS LAST, "updatedAt" ASC
    LIMIT ${limit}
  `;
}

export function createApplicationForUser(
  userId: string,
  data: ApplicationInput,
) {
  return prisma.application.create({ data: { ...data, userId } });
}

export async function updateApplicationForUser(
  id: string,
  userId: string,
  data: ApplicationMutation,
): Promise<boolean> {
  const { count } = await prisma.application.updateMany({
    where: { id, userId },
    data,
  });
  return count > 0;
}

export async function saveApplicationAnalysis(
  id: string,
  userId: string,
  analysis: StoredJdAnalysis,
  analysisHash: string,
): Promise<boolean> {
  return updateApplicationForUser(id, userId, {
    analysis,
    analysisHash,
    analyzedAt: new Date(),
  });
}

export async function deleteApplicationForUser(
  id: string,
  userId: string,
): Promise<void> {
  await prisma.application.deleteMany({ where: { id, userId } });
}
