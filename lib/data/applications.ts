import { prisma } from "@/lib/prisma";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/validations/application";

// Every query is scoped by userId — a user can only ever read their own
// applications. This is the real authorization boundary (alongside the
// session check), not the proxy.

export function getApplications(userId: string, status?: ApplicationStatus) {
  return prisma.application.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
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
  return prisma.application.findMany({
    where: {
      userId,
      deadline: { gte: new Date() },
      status: { not: "REJECTED" },
    },
    orderBy: { deadline: "asc" },
    take: limit,
  });
}
