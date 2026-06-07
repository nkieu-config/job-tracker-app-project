import { Fragment } from "react";
import Link from "next/link";
import {
  STATUS_LABELS,
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/validations/application";

// Funnel stages in flow order. REJECTED is a terminal outcome shown apart.
const FUNNEL: ApplicationStatus[] = ["SAVED", "APPLIED", "INTERVIEW", "OFFER"];

const ACCENT: Record<
  ApplicationStatus,
  { dot: string; fill: string; num: string; seg: string }
> = {
  SAVED: {
    dot: "bg-zinc-400",
    fill: "bg-zinc-400",
    num: "text-zinc-900 dark:text-zinc-100",
    seg: "bg-zinc-300 dark:bg-zinc-600",
  },
  APPLIED: {
    dot: "bg-blue-500",
    fill: "bg-blue-500",
    num: "text-blue-600 dark:text-blue-400",
    seg: "bg-blue-500",
  },
  INTERVIEW: {
    dot: "bg-amber-500",
    fill: "bg-amber-500",
    num: "text-amber-600 dark:text-amber-400",
    seg: "bg-amber-500",
  },
  OFFER: {
    dot: "bg-green-500",
    fill: "bg-green-500",
    num: "text-green-600 dark:text-green-400",
    seg: "bg-green-500",
  },
  REJECTED: {
    dot: "bg-red-500",
    fill: "bg-red-400",
    num: "text-red-600 dark:text-red-400",
    seg: "bg-red-400",
  },
};

function FunnelBar({
  counts,
  total,
}: {
  counts: Record<ApplicationStatus, number>;
  total: number;
}) {
  return (
    <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      {APPLICATION_STATUSES.map((status) =>
        counts[status] > 0 ? (
          <div
            key={status}
            className={ACCENT[status].seg}
            style={{ width: `${(counts[status] / total) * 100}%` }}
            title={`${STATUS_LABELS[status]}: ${counts[status]}`}
          />
        ) : null,
      )}
    </div>
  );
}

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
      className="animate-rise flex flex-1 flex-col gap-2.5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md md:min-w-0 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {STATUS_LABELS[status]}
        </span>
      </div>
      <span
        className={`text-4xl font-semibold leading-none tabular-nums ${accent.num}`}
      >
        {count}
      </span>
      <div className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
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
  const total = APPLICATION_STATUSES.reduce((sum, s) => sum + counts[s], 0);
  const max = Math.max(1, ...FUNNEL.map((s) => counts[s]));

  return (
    <div className="flex flex-col gap-4">
      <FunnelBar counts={counts} total={total} />

      <div className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
        {FUNNEL.map((status, i) => (
          <Fragment key={status}>
            <StageCard status={status} count={counts[status]} max={max} index={i} />
            {i < FUNNEL.length - 1 && (
              <div
                aria-hidden
                className="hidden shrink-0 items-center justify-center px-1.5 text-zinc-300 md:flex dark:text-zinc-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <Link
        href="/dashboard/applications?status=REJECTED"
        style={{ animationDelay: "280ms" }}
        className="animate-rise flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-2.5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          <span className={`h-2 w-2 rounded-full ${ACCENT.REJECTED.dot}`} />
          Rejected
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-600 dark:text-zinc-400">
          {counts.REJECTED}
        </span>
      </Link>
    </div>
  );
}
