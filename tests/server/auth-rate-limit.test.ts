import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const rateLimit = vi.fn();
vi.mock("@/server/rate-limit", () => ({
  rateLimit: (...a: unknown[]) => rateLimit(...a),
}));

const { postgresRateLimitStorage } = await import("@/server/auth-rate-limit");

const NOW = new Date("2026-07-13T12:00:00.000Z");
const RULE = { window: 300, max: 10 };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  rateLimit.mockReset().mockResolvedValue({ ok: true, resetAt: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("postgresRateLimitStorage.consume", () => {
  it("allows a request the shared Postgres limiter accepts", async () => {
    await expect(
      postgresRateLimitStorage.consume("1.2.3.4/sign-in/email", RULE),
    ).resolves.toEqual({ allowed: true, retryAfter: null });
  });

  // Better Auth derives its key from request identity. Without a namespace an
  // auth key could collide with an `ai:`/`upload:` one and share its counter.
  it("namespaces the key so it cannot collide with the AI or upload budgets", async () => {
    await postgresRateLimitStorage.consume("1.2.3.4/sign-in/email", RULE);

    expect(rateLimit).toHaveBeenCalledWith("auth:1.2.3.4/sign-in/email", 10, 300_000);
  });

  it("converts the rule's window from seconds to the limiter's milliseconds", async () => {
    await postgresRateLimitStorage.consume("k", { window: 3600, max: 5 });

    expect(rateLimit).toHaveBeenCalledWith("auth:k", 5, 3_600_000);
  });

  it("denies once the window is spent, with Retry-After in whole seconds", async () => {
    rateLimit.mockResolvedValue({
      ok: false,
      resetAt: new Date(NOW.getTime() + 90_000),
    });

    await expect(
      postgresRateLimitStorage.consume("k", RULE),
    ).resolves.toEqual({ allowed: false, retryAfter: 90 });
  });

  it("rounds a partial second up, never telling the client to retry too early", async () => {
    rateLimit.mockResolvedValue({
      ok: false,
      resetAt: new Date(NOW.getTime() + 1_400),
    });

    await expect(postgresRateLimitStorage.consume("k", RULE)).resolves.toEqual({
      allowed: false,
      retryAfter: 2,
    });
  });

  // An already-expired window would compute a zero or negative Retry-After,
  // which reads to a client as "retry immediately" — a hot loop against the
  // endpoint we just refused.
  it("floors Retry-After at one second when the window already expired", async () => {
    rateLimit.mockResolvedValue({
      ok: false,
      resetAt: new Date(NOW.getTime() - 60_000),
    });

    await expect(postgresRateLimitStorage.consume("k", RULE)).resolves.toEqual({
      allowed: false,
      retryAfter: 1,
    });
  });
});

// Better Auth reaches for get/set only when `consume` is missing, and that
// path cannot enforce anything here: a null read means "no limit recorded", so
// staying inert would silently unlock every auth endpoint. Failing loudly is
// what makes such an upgrade impossible to miss.
describe("postgresRateLimitStorage fallback interface", () => {
  it("offers consume, the only path that enforces the limit", () => {
    expect(typeof postgresRateLimitStorage.consume).toBe("function");
  });

  it("refuses to serve the fail-open get/set fallback", async () => {
    await expect(postgresRateLimitStorage.get()).rejects.toThrow(/consume/);
    await expect(postgresRateLimitStorage.set()).rejects.toThrow(/consume/);
    expect(rateLimit).not.toHaveBeenCalled();
  });
});
