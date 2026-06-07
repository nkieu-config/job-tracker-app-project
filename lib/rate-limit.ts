import { prisma } from "@/lib/prisma";

export type RateLimitResult = { ok: boolean; resetAt: Date };

// Shared budget across all AI features per user (analyze, fit, tailor).
export const AI_RATE_MAX = 30;
export const AI_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
