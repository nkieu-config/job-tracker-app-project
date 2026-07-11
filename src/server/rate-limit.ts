import "server-only";

import { prisma } from "@/server/prisma";

export type RateLimitResult = { ok: boolean; resetAt: Date };

// Shared budget across all AI features per user (analyze, fit, tailor).
export const AI_RATE_MAX = 30;
export const AI_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Uploads cost blob storage and a PDF parse, and each new resume version is
// work the next fit computation has to embed. Bound the burst separately from
// the AI budget.
export const UPLOAD_RATE_MAX = 20;
export const UPLOAD_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Fixed-window rate limiter backed by Postgres. A single atomic upsert keeps
// it correct under concurrency and across serverless instances (in-memory
// counters wouldn't be shared). Returns ok=false once `max` is exceeded
// within `windowMs`.
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const expiresAt = new Date(Date.now() + windowMs);

  const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
    INSERT INTO "rate_limit" ("key", "count", "expiresAt")
    VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limit"."expiresAt" < now() THEN 1
        ELSE "rate_limit"."count" + 1
      END,
      "expiresAt" = CASE
        WHEN "rate_limit"."expiresAt" < now() THEN ${expiresAt}
        ELSE "rate_limit"."expiresAt"
      END
    RETURNING "count", "expiresAt"
  `;

  const row = rows[0];
  return { ok: row.count <= max, resetAt: row.expiresAt };
}

// Shared helper for all AI features: returns false once the per-user hourly
// AI budget is exceeded.
export async function checkAiRateLimit(userId: string): Promise<boolean> {
  const { ok } = await rateLimit(`ai:${userId}`, AI_RATE_MAX, AI_RATE_WINDOW_MS);
  return ok;
}

export async function checkUploadRateLimit(userId: string): Promise<boolean> {
  const { ok } = await rateLimit(
    `upload:${userId}`,
    UPLOAD_RATE_MAX,
    UPLOAD_RATE_WINDOW_MS,
  );
  return ok;
}

// `rate_limit` rows are only ever overwritten on key conflict, never removed.
// Per-user AI keys are bounded by the user count, but Better Auth derives its
// keys from request identity (which includes the client IP), so without a sweep
// the table grows by one dead row per IP per endpoint, forever.
export async function deleteExpiredRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
