import type { ApplicationStatus } from "@/lib/schemas/application";

export type AgendaRow = {
  id: string;
  role: string;
  company: string;
  status: ApplicationStatus;
  deadline: Date | null;
  hasJd: boolean;
  analyzed: boolean;
  hasPrep: boolean;
  updatedAt: Date;
};

export type AgendaItem = {
  id: string;
  role: string;
  company: string;
  when: string;
  what: string;
  why: string;
  urgent: boolean;
};

const DAY = 86_400_000;
const CLOSING_SOON_DAYS = 7;
const SILENT_DAYS = 14;

export function daysBetween(from: Date, to: Date): number {
  const a = Date.parse(from.toISOString().slice(0, 10));
  const b = Date.parse(to.toISOString().slice(0, 10));
  return Math.round((b - a) / DAY);
}

function inDays(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

// One row can be behind on several fronts at once; only its most urgent reason
// earns a place, so a single application can never fill the whole list.
function reasonFor(row: AgendaRow, now: Date): (AgendaItem & { rank: number }) | null {
  const base = { id: row.id, role: row.role, company: row.company };
  const days = row.deadline ? daysBetween(now, row.deadline) : null;

  if (days !== null && days <= CLOSING_SOON_DAYS && row.status !== "OFFER") {
    return {
      ...base,
      rank: days,
      when: inDays(days),
      what: row.hasJd && !row.analyzed ? "Read the posting and apply" : "Apply",
      why:
        days < 0
          ? "The deadline has passed — worth checking whether it is still open."
          : "The deadline is close.",
      urgent: days <= 3,
    };
  }

  if (row.status === "INTERVIEW" && !row.hasPrep) {
    return {
      ...base,
      rank: 20,
      when: "before it",
      what: "Draft a prep sheet",
      why: "You have an interview and nothing to practise against yet.",
      urgent: true,
    };
  }

  if (row.hasJd && !row.analyzed) {
    return {
      ...base,
      rank: 40,
      when: "2 min",
      what: "Read the posting",
      why: "The posting is saved but has not been read against your resumes.",
      urgent: false,
    };
  }

  const silentFor = daysBetween(row.updatedAt, now);
  if (row.status === "APPLIED" && silentFor >= SILENT_DAYS) {
    return {
      ...base,
      rank: 60 - Math.min(silentFor, 59),
      when: `${silentFor}d quiet`,
      what: "Follow up",
      why: "Nothing has moved here since you applied.",
      urgent: false,
    };
  }

  return null;
}

export function buildAgenda(
  rows: AgendaRow[],
  now: Date = new Date(),
  limit = 4,
): AgendaItem[] {
  return rows
    .map((row) => reasonFor(row, now))
    .filter((item): item is AgendaItem & { rank: number } => item !== null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ rank: _rank, ...item }) => item);
}
