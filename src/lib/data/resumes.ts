import { prisma } from "@/lib/prisma";

// Scoped by userId — a user only ever sees their own resume versions.
export function getResumeVersions(userId: string) {
  return prisma.resumeVersion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function getResumeVersion(id: string, userId: string) {
  return prisma.resumeVersion.findFirst({ where: { id, userId } });
}
