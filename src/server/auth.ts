import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/server/prisma";
import { rateLimit } from "@/server/rate-limit";

const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
const SESSION_REFRESH_AFTER_SECONDS = 60 * 60 * 24;

// Better Auth's rate limiter defaults to an in-memory store, which is
// per-instance and so does nothing on serverless. Backing `consume` with the
// same atomic Postgres upsert the AI limiter uses makes the limit hold across
// instances, and supplying `consume` opts out of Better Auth's non-atomic
// check-then-increment fallback.
const postgresRateLimitStorage = {
  get: async () => null,
  set: async () => {},
  consume: async (key: string, rule: { window: number; max: number }) => {
    const { ok, resetAt } = await rateLimit(
      `auth:${key}`,
      rule.max,
      rule.window * 1000,
    );
    if (ok) return { allowed: true, retryAfter: null };
    const retryAfter = Math.max(
      1,
      Math.ceil((resetAt.getTime() - Date.now()) / 1000),
    );
    return { allowed: false, retryAfter };
  },
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_REFRESH_AFTER_SECONDS,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 300, max: 10 },
      "/sign-up/email": { window: 3600, max: 5 },
    },
    customStorage: postgresRateLimitStorage,
  },
  // nextCookies() must be the LAST plugin — it lets Better Auth set cookies
  // from Next.js server actions/route handlers.
  plugins: [nextCookies()],
});
