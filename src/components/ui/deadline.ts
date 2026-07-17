import type { DeadlineTone } from "@/lib/format";

export const DEADLINE_TONE_CLASS: Record<DeadlineTone, string> = {
  overdue: "text-semantic-error font-semibold",
  soon: "text-semantic-warning",
  upcoming: "text-ink-mute",
};
