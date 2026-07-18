export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

export function startOfWeekUtc(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}

export type WeekBucket<T> = {
  start: Date;
  end: Date;
  items: T[];
};

export function bucketByWeek<T>(
  items: readonly T[],
  getDate: (item: T) => Date,
  weeks: number,
  now: Date,
): WeekBucket<T>[] {
  const currentWeekStart = startOfWeekUtc(now).getTime();
  const firstWeekStart = currentWeekStart - (weeks - 1) * WEEK_MS;
  const rangeEnd = currentWeekStart + WEEK_MS;

  const buckets: WeekBucket<T>[] = Array.from({ length: weeks }, (_, i) => {
    const start = firstWeekStart + i * WEEK_MS;
    return {
      start: new Date(start),
      end: new Date(start + WEEK_MS),
      items: [],
    };
  });

  for (const item of items) {
    const t = getDate(item).getTime();
    if (t < firstWeekStart || t >= rangeEnd) continue;
    const index = Math.floor((t - firstWeekStart) / WEEK_MS);
    buckets[index].items.push(item);
  }
  return buckets;
}

export function stackSegments(
  values: readonly number[],
): { start: number; size: number }[] {
  let offset = 0;
  return values.map((size) => {
    const segment = { start: offset, size };
    offset += size;
    return segment;
  });
}

export type NiceScale = { max: number; ticks: number[] };

export function niceScale(rawMax: number, targetTicks = 4): NiceScale {
  if (rawMax <= 0) return { max: 1, ticks: [0, 1] };

  const rough = rawMax / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    magnitude;

  const max = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) {
    ticks.push(Math.round(value * 1e6) / 1e6);
  }
  return { max, ticks };
}

const weekLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

export function formatWeekLabel(weekStart: Date): string {
  return weekLabel.format(weekStart);
}
