import { prisma } from "@/lib/prisma";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/schemas/application";

// Every query is scoped by userId — a user can only ever read their own
// applications. This is the real authorization boundary (alongside the
// session check), not the proxy.

export const APPLICATION_SORTS = ["newest", "deadline", "company"] as const;
export type ApplicationSort = (typeof APPLICATION_SORTS)[number];

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

export function getApplication(id: string, userId: string) {
  return prisma.application.findFirst({ where: { id, userId } });
}

export async function getStatusCounts(
  userId: string,
): Promise<Record<ApplicationStatus, number>> {
  const grouped = await prisma.application.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    APPLICATION_STATUSES.map((s) => [s, 0]),
  ) as Record<ApplicationStatus, number>;

  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }
  return counts;
}

export function getUpcomingDeadlines(userId: string, limit = 5) {
  const startOfTodayUtc = new Date(new Date().toISOString().slice(0, 10));
  return prisma.application.findMany({
    where: {
      userId,
      deadline: { gte: startOfTodayUtc },
      status: { not: "REJECTED" },
    },
    orderBy: { deadline: "asc" },
    take: limit,
  });
}
