import "server-only";

import { prisma } from "@/server/prisma";

// Also the hard cap on how many versions a user may create: past this point
// the list views would silently hide the extra rows while still billing for
// their blob storage and embedding them.
export const MAX_RESUME_VERSIONS = 100;

export function countResumeVersions(userId: string) {
  return prisma.resumeVersion.count({ where: { userId } });
}

// Scoped by userId — a user only ever sees their own resume versions.
// Each reader selects only the columns it renders: `content` holds a resume's
// full extracted text, so pulling it into a list view moves megabytes for
// nothing.
export function getResumeSummaries(userId: string) {
  return prisma.resumeVersion.findMany({
    where: { userId },
    select: { id: true, label: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: MAX_RESUME_VERSIONS,
  });
}

export function getResumeTexts(userId: string) {
  return prisma.resumeVersion.findMany({
    where: { userId },
    select: { id: true, content: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: MAX_RESUME_VERSIONS,
  });
}

export function getResumeVersion(id: string, userId: string) {
  return prisma.resumeVersion.findFirst({ where: { id, userId } });
}

export function getResumeFileUrl(id: string, userId: string) {
  return prisma.resumeVersion.findFirst({
    where: { id, userId },
    select: { fileUrl: true },
  });
}
