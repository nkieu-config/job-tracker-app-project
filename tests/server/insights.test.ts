import { describe, it, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const queryRaw = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: { application: { findMany }, $queryRaw: queryRaw },
}));

const {
  getWeeklyActivity,
  getBestFitPerApplication,
  ACTIVITY_WEEKS,
  MAX_FIT_POINTS,
} = await import("@/server/data/insights");

const now = new Date("2026-07-15T12:00:00.000Z");
const row = (iso: string, status: string) => ({
  createdAt: new Date(iso),
  status,
});

beforeEach(() => {
  findMany.mockReset();
  queryRaw.mockReset();
});

describe("getWeeklyActivity", () => {
  it("returns one bucket per configured week", async () => {
    findMany.mockResolvedValue([]);
    const weeks = await getWeeklyActivity("u1", now);
    expect(weeks).toHaveLength(ACTIVITY_WEEKS);
  });

  it("scopes the query to the user and bounds it to the window", async () => {
    findMany.mockResolvedValue([]);
    await getWeeklyActivity("u1", now);
    const where = findMany.mock.calls[0][0].where;
    expect(where.userId).toBe("u1");
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(where.createdAt.gte.getTime()).toBeLessThan(now.getTime());
  });

  it("counts applications into the correct week and status", async () => {
    findMany.mockResolvedValue([
      row("2026-07-14T09:00:00.000Z", "APPLIED"),
      row("2026-07-15T09:00:00.000Z", "APPLIED"),
      row("2026-07-13T09:00:00.000Z", "INTERVIEW"),
    ]);
    const weeks = await getWeeklyActivity("u1", now);
    const current = weeks.at(-1)!;
    expect(current.counts.APPLIED).toBe(2);
    expect(current.counts.INTERVIEW).toBe(1);
    expect(current.total).toBe(3);
  });

  it("labels each bucket and serializes the week start as ISO", async () => {
    findMany.mockResolvedValue([]);
    const weeks = await getWeeklyActivity("u1", now);
    expect(weeks.at(-1)!.weekStart).toBe("2026-07-13T00:00:00.000Z");
    expect(weeks.at(-1)!.label).toBe("Jul 13");
  });

  it("leaves untouched weeks at zero across every status", async () => {
    findMany.mockResolvedValue([]);
    const [first] = await getWeeklyActivity("u1", now);
    expect(Object.values(first.counts).every((n) => n === 0)).toBe(true);
    expect(first.total).toBe(0);
  });
});

describe("getBestFitPerApplication", () => {
  it("passes the userId through to the scoped raw query", async () => {
    queryRaw.mockResolvedValue([]);
    await getBestFitPerApplication("u1");
    const params = queryRaw.mock.calls[0].slice(1);
    expect(params).toContain("u1");
  });

  it("returns the rows the query produces", async () => {
    const rows = [
      { id: "a", company: "Acme", role: "FE", status: "APPLIED", score: 0.8 },
    ];
    queryRaw.mockResolvedValue(rows);
    await expect(getBestFitPerApplication("u1")).resolves.toEqual(rows);
  });

  it("caps the number of points requested", () => {
    expect(MAX_FIT_POINTS).toBeGreaterThan(0);
  });
});
