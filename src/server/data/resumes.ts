import "server-only";

import { cache } from "react";
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

export type ResumeTextMeta = {
  id: string;
  createdAt: Date;
  hasText: boolean;
};

// Both queries below test "holds a non-whitespace character" as
// `content ~ '[^[:space:]]'` rather than the more obvious
// `length(trim(content)) > 0`: Postgres `trim` strips *spaces* only, so a
// scanned PDF that extracts to nothing but newlines would read as having text,
// while JavaScript's `.trim()` — the semantics every caller expects — says it
// doesn't. The regex matches `.trim()` on every shape a resume can hold.

// Everything a caller can ask about a user's resumes *without* reading their
// text: how many there are, when they landed, and whether any holds readable
// text. Postgres answers the presence question so the rows stay bytes rather
// than megabytes — only `getResumeText` below is worth paying full price for.
export function getResumeTextMeta(userId: string) {
  return prisma.$queryRaw<ResumeTextMeta[]>`
    SELECT id, "createdAt",
           (content IS NOT NULL AND content ~ '[^[:space:]]') AS "hasText"
    FROM "resume_version"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
    LIMIT ${MAX_RESUME_VERSIONS}
  `;
}

export async function hasResumeWithText(userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM "resume_version"
      WHERE "userId" = ${userId}
        AND content IS NOT NULL
        AND content ~ '[^[:space:]]'
    ) AS "exists"
  `;
  return rows[0].exists;
}

// The AI features match skills against the user's resumes as one corpus, so the
// text arrives pre-joined — the newest resume first, matching every other read.
export async function getResumeText(userId: string): Promise<string> {
  const rows = await prisma.resumeVersion.findMany({
    where: { userId },
    select: { content: true },
    orderBy: { createdAt: "desc" },
    take: MAX_RESUME_VERSIONS,
  });
  return rows.map((r) => r.content ?? "").join("\n");
}

export const getResumeVersion = cache((id: string, userId: string) => {
  return prisma.resumeVersion.findFirst({ where: { id, userId } });
});

export function getResumeFileUrl(id: string, userId: string) {
  return prisma.resumeVersion.findFirst({
    where: { id, userId },
    select: { fileUrl: true },
  });
}

export function createResumeVersion(
  userId: string,
  data: { label: string; fileUrl: string; content: string },
) {
  return prisma.resumeVersion.create({ data: { ...data, userId } });
}

export async function deleteResumeForUser(
  id: string,
  userId: string,
): Promise<void> {
  await prisma.resumeVersion.deleteMany({ where: { id, userId } });
}
