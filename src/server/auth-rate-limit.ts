import "server-only";

import { rateLimit } from "@/server/rate-limit";

export type AuthRateLimitRule = { window: number; max: number };

// Better Auth's rate limiter defaults to an in-memory store, which is
// per-instance and so does nothing on serverless. Backing `consume` with the
// same atomic Postgres upsert the AI limiter uses makes the limit hold across
// instances, and supplying `consume` opts out of Better Auth's non-atomic
// check-then-increment fallback.
//
// `get`/`set` are the fallback interface Better Auth uses only when `consume`
// is absent, and a no-op pair would fail *open*: `get` returning null reads as
// "no limit recorded", so every request would be allowed and `set` would drop
// the count. They throw instead, so a future release that stops preferring
// `consume` breaks loudly rather than silently unlocking the auth endpoints.
export const postgresRateLimitStorage = {
  get: async (): Promise<never> => {
    throw new Error(
      "Better Auth fell back to rate-limit storage.get; `consume` is the only path that enforces the limit.",
    );
  },
  set: async (): Promise<never> => {
    throw new Error(
      "Better Auth fell back to rate-limit storage.set; `consume` is the only path that enforces the limit.",
    );
  },
  consume: async (key: string, rule: AuthRateLimitRule) => {
    // Namespaced so an auth key can never collide with an `ai:`/`upload:` one.
    const { ok, resetAt } = await rateLimit(
      `auth:${key}`,
      rule.max,
      rule.window * 1000,
    );
    if (ok) return { allowed: true, retryAfter: null };

    // Better Auth sends this straight to the client as `Retry-After`, which is
    // whole seconds — and a stale window that already expired would otherwise
    // yield 0 or a negative, telling the client to retry immediately.
    const retryAfter = Math.max(
      1,
      Math.ceil((resetAt.getTime() - Date.now()) / 1000),
    );
    return { allowed: false, retryAfter };
  },
};
