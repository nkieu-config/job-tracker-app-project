import { Fragment } from "react";
import Link from "next/link";
import {
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/validations/application";

// The four funnel stages, in flow order. REJECTED is a terminal outcome shown
// separately below the funnel.
const FUNNEL: ApplicationStatus[] = ["SAVED", "APPLIED", "INTERVIEW", "OFFER"];

const ACCENT: Record<ApplicationStatus, { dot: string; fill: string }> = {
  SAVED: { dot: "bg-zinc-400", fill: "bg-zinc-400" },
  APPLIED: { dot: "bg-blue-500", fill: "bg-blue-500" },
  INTERVIEW: { dot: "bg-amber-500", fill: "bg-amber-500" },
  OFFER: { dot: "bg-green-500", fill: "bg-green-500" },
  REJECTED: { dot: "bg-red-500", fill: "bg-red-500" },
};

function StageCard({
  status,
  count,
  max,
  index,
}: {
  status: ApplicationStatus;
  count: number;
  max: number;
  index: number;
}) {
  const accent = ACCENT[status];
  const pct = count ? Math.max(Math.round((count / max) * 100), 8) : 0;

  return (
    <Link
      href={`/dashboard/applications?status=${status}`}
      style={{ animationDelay: `${index * 70}ms` }}
      className="animate-rise flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm md:flex-1 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {STATUS_LABELS[status]}
        </span>
      </div>
      <span className="text-3xl font-semibold tabular-nums text-black dark:text-zinc-50">
        {count}
      </span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full ${accent.fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

export function Pipeline({
  counts,
}: {
  counts: Record<ApplicationStatus, number>;
}) {
  const max = Math.max(1, ...FUNNEL.map((s) => counts[s]));

  return (
    <div>
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
        {FUNNEL.map((status, i) => (
          <Fragment key={status}>
            <StageCard status={status} count={counts[status]} max={max} index={i} />
            {i < FUNNEL.length - 1 && (
              <div
                aria-hidden
                className="hidden items-center justify-center px-2 text-lg text-zinc-300 md:flex dark:text-zinc-700"
              >
                ›
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <Link
        href="/dashboard/applications?status=REJECTED"
        style={{ animationDelay: "280ms" }}
        className="animate-rise mt-3 flex items-center justify-between rounded-xl border border-dashed border-zinc-200 px-4 py-2.5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
      >
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <span className={`h-1.5 w-1.5 rounded-full ${ACCENT.REJECTED.dot}`} />
          Rejected
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-600 dark:text-zinc-400">
          {counts.REJECTED}
        </span>
      </Link>
    </div>
  );
}
