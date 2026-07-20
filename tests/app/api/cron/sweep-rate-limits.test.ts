import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const deleteExpiredRateLimits = vi.fn();
vi.mock("@/server/rate-limit", () => ({
  deleteExpiredRateLimits: () => deleteExpiredRateLimits(),
}));

const deleteExpiredAiUsage = vi.fn();
vi.mock("@/server/data/ai-usage", () => ({
  deleteExpiredAiUsage: () => deleteExpiredAiUsage(),
}));

const { GET } = await import("@/app/api/cron/sweep-rate-limits/route");

const SECRET = "s3cret-cron-token";
const originalSecret = process.env.CRON_SECRET;

function request(authorization?: string): Request {
  return new Request("http://test/api/cron/sweep-rate-limits", {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  deleteExpiredRateLimits.mockReset().mockResolvedValue(7);
  deleteExpiredAiUsage.mockReset().mockResolvedValue(3);
  process.env.CRON_SECRET = SECRET;
});

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalSecret;
  }
});

describe("GET /api/cron/sweep-rate-limits", () => {
  it("refuses to run when CRON_SECRET is unset rather than accepting anyone", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect(deleteExpiredRateLimits).not.toHaveBeenCalled();
    expect(deleteExpiredAiUsage).not.toHaveBeenCalled();
  });

  it("treats an empty CRON_SECRET as unconfigured, so `Bearer ` cannot match it", async () => {
    process.env.CRON_SECRET = "";
    const res = await GET(request("Bearer "));
    expect(res.status).toBe(503);
    expect(deleteExpiredRateLimits).not.toHaveBeenCalled();
    expect(deleteExpiredAiUsage).not.toHaveBeenCalled();
  });

  it.each([
    { scenario: "no authorization header", authorization: undefined },
    { scenario: "the raw secret with no Bearer scheme", authorization: SECRET },
    { scenario: "a wrong secret", authorization: "Bearer not-the-secret" },
    {
      scenario: "a prefix of the real secret",
      authorization: `Bearer ${SECRET.slice(0, -1)}`,
    },
    {
      scenario: "the real secret with extra bytes appended",
      authorization: `Bearer ${SECRET}x`,
    },
    { scenario: "a lowercased scheme", authorization: `bearer ${SECRET}` },
  ])("rejects $scenario without sweeping", async ({ authorization }) => {
    const res = await GET(request(authorization));
    expect(res.status).toBe(401);
    expect(deleteExpiredRateLimits).not.toHaveBeenCalled();
    expect(deleteExpiredAiUsage).not.toHaveBeenCalled();
  });

  it("sweeps both tables and reports each count for an authorized cron call", async () => {
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      deleted: { rateLimits: 7, aiUsage: 3 },
    });
    expect(deleteExpiredRateLimits).toHaveBeenCalledTimes(1);
    expect(deleteExpiredAiUsage).toHaveBeenCalledTimes(1);
  });
});
