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
