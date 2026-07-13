import "server-only";

import { rateLimit } from "@/server/rate-limit";

export type AuthRateLimitRule = { window: number; max: number };

// Better Auth's rate limiter defaults to an in-memory store, which is
// per-instance and so does nothing on serverless. Backing `consume` with the
// same atomic Postgres upsert the AI limiter uses makes the limit hold across
// instances, and supplying `consume` opts out of Better Auth's non-atomic
// check-then-increment fallback.
//
// `get`/`set` are the fallback's interface. They stay inert on purpose: if a
// future Better Auth reached for them, a no-op store fails closed to "no
// limit recorded" rather than silently reintroducing per-instance counters.
export const postgresRateLimitStorage = {
  get: async () => null,
  set: async () => {},
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
