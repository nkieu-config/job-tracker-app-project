import type { ApplicationStatus } from "@/lib/validations/application";

// Single source of truth for per-status colors. `badge` is the soft pill used
// by StatusBadge; the rest drive the dashboard pipeline (dot, bar fill,
// emphasised number, funnel-bar segment).
export type StatusColor = {
  badge: string;
  dot: string;
  fill: string;
  num: string;
  seg: string;
};

export const STATUS_COLORS: Record<ApplicationStatus, StatusColor> = {
  SAVED: {
    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    dot: "bg-zinc-400",
    fill: "bg-zinc-400",
    num: "text-zinc-900 dark:text-zinc-100",
    seg: "bg-zinc-300 dark:bg-zinc-600",
  },
  APPLIED: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    dot: "bg-blue-500",
    fill: "bg-blue-500",
    num: "text-blue-600 dark:text-blue-400",
    seg: "bg-blue-500",
  },
  INTERVIEW: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    dot: "bg-amber-500",
    fill: "bg-amber-500",
    num: "text-amber-600 dark:text-amber-400",
    seg: "bg-amber-500",
  },
  OFFER: {
    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    dot: "bg-green-500",
    fill: "bg-green-500",
    num: "text-green-600 dark:text-green-400",
    seg: "bg-green-500",
  },
  REJECTED: {
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    dot: "bg-red-500",
    fill: "bg-red-400",
    num: "text-red-600 dark:text-red-400",
    seg: "bg-red-400",
  },
};
