const displayDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  dateStyle: "medium",
});

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDisplayDate(date: Date): string {
  return displayDate.format(date);
}

export type DeadlineTone = "overdue" | "soon" | "upcoming";

export function deadlineTone(date: Date, now: Date = new Date()): DeadlineTone {
  const startOfToday = Date.parse(now.toISOString().slice(0, 10));
  const target = Date.parse(date.toISOString().slice(0, 10));
  const days = Math.round((target - startOfToday) / 86_400_000);
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "upcoming";
}
