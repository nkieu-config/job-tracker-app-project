// Format a date as an ISO day (YYYY-MM-DD) for display.
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
