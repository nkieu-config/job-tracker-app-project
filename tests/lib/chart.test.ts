import { describe, it, expect } from "vitest";
import {
  startOfWeekUtc,
  bucketByWeek,
  stackSegments,
  niceScale,
  formatWeekLabel,
  WEEK_MS,
} from "@/lib/chart";

describe("startOfWeekUtc", () => {
  it("returns the Monday 00:00 UTC of the containing week", () => {
    const wed = new Date("2026-07-15T13:45:00.000Z");
    expect(startOfWeekUtc(wed).toISOString()).toBe("2026-07-13T00:00:00.000Z");
  });

  it("treats Monday as the first day of its own week", () => {
    const mon = new Date("2026-07-13T00:00:00.000Z");
    expect(startOfWeekUtc(mon).toISOString()).toBe("2026-07-13T00:00:00.000Z");
  });

  it("maps Sunday back to the previous Monday", () => {
    const sun = new Date("2026-07-19T23:59:59.000Z");
    expect(startOfWeekUtc(sun).toISOString()).toBe("2026-07-13T00:00:00.000Z");
  });

  it("crosses a month boundary correctly", () => {
    const early = new Date("2026-08-02T10:00:00.000Z");
    expect(startOfWeekUtc(early).toISOString()).toBe("2026-07-27T00:00:00.000Z");
  });
});

describe("bucketByWeek", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");
  const at = (iso: string) => ({ createdAt: new Date(iso) });
  const get = (x: { createdAt: Date }) => x.createdAt;

  it("produces one bucket per week, oldest first", () => {
    const buckets = bucketByWeek([], get, 4, now);
    expect(buckets).toHaveLength(4);
    expect(buckets[0].start.toISOString()).toBe("2026-06-22T00:00:00.000Z");
    expect(buckets[3].start.toISOString()).toBe("2026-07-13T00:00:00.000Z");
  });

  it("keeps empty weeks as zero-item buckets rather than dropping them", () => {
    const items = [at("2026-07-14T00:00:00.000Z")];
    const buckets = bucketByWeek(items, get, 4, now);
    expect(buckets.map((b) => b.items.length)).toEqual([0, 0, 0, 1]);
  });

  it("assigns each item to the week that contains it", () => {
    const items = [
      at("2026-06-22T00:00:00.000Z"),
      at("2026-06-28T23:59:59.000Z"),
      at("2026-07-13T08:00:00.000Z"),
    ];
    const buckets = bucketByWeek(items, get, 4, now);
    expect(buckets.map((b) => b.items.length)).toEqual([2, 0, 0, 1]);
  });

  it("drops items outside the visible window", () => {
    const items = [
      at("2026-05-01T00:00:00.000Z"),
      at("2026-07-14T00:00:00.000Z"),
    ];
    const buckets = bucketByWeek(items, get, 4, now);
    expect(buckets.reduce((n, b) => n + b.items.length, 0)).toBe(1);
  });

  it("includes an item on the last instant of the current week", () => {
    const items = [at("2026-07-19T23:59:59.999Z")];
    const buckets = bucketByWeek(items, get, 4, now);
    expect(buckets[3].items).toHaveLength(1);
  });

  it("spans exactly one week per bucket", () => {
    const [first] = bucketByWeek([], get, 2, now);
    expect(first.end.getTime() - first.start.getTime()).toBe(WEEK_MS);
  });
});

describe("stackSegments", () => {
  it("accumulates offsets so segments sit end to end", () => {
    expect(stackSegments([2, 3, 0, 1])).toEqual([
      { start: 0, size: 2 },
      { start: 2, size: 3 },
      { start: 5, size: 0 },
      { start: 5, size: 1 },
    ]);
  });

  it("returns nothing for no values", () => {
    expect(stackSegments([])).toEqual([]);
  });
});

describe("niceScale", () => {
  it("falls back to a unit axis when there is no data", () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
  });

  it("rounds a small count up to a clean integer max", () => {
    const scale = niceScale(3);
    expect(scale.max).toBeGreaterThanOrEqual(3);
    expect(scale.ticks[0]).toBe(0);
    expect(scale.ticks.at(-1)).toBe(scale.max);
  });

  it("keeps ticks integer-valued for count data", () => {
    const scale = niceScale(7);
    expect(scale.ticks.every((t) => Number.isInteger(t))).toBe(true);
  });

  it("covers the raw max within the returned range", () => {
    for (const raw of [1, 4, 9, 12, 23, 47, 100]) {
      expect(niceScale(raw).max).toBeGreaterThanOrEqual(raw);
    }
  });
});

describe("formatWeekLabel", () => {
  it("formats in UTC regardless of the host timezone", () => {
    expect(formatWeekLabel(new Date("2026-07-13T00:00:00.000Z"))).toBe("Jul 13");
  });
});
