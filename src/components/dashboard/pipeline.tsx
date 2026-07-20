import { Fragment } from "react";
import Link from "next/link";
import {
  STATUS_LABELS,
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { STATUS_COLORS } from "@/components/ui/status-colors";

// Funnel stages in flow order. REJECTED is a terminal outcome shown apart.
const FUNNEL: ApplicationStatus[] = ["SAVED", "APPLIED", "INTERVIEW", "OFFER"];

// The applications page only honours `status` in list view — the board shows
// every column — so a stage link that omits `view=list` lands on an unfiltered
// board.
function stageHref(status: ApplicationStatus): string {
  return `/dashboard/applications?view=list&status=${status}`;
}

function FunnelBar({
  counts,
  total,
}: {
  counts: Record<ApplicationStatus, number>;
  total: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-hairline"
    >
      {APPLICATION_STATUSES.map((status) =>
        counts[status] > 0 ? (
          <div
            key={status}
            className={STATUS_COLORS[status].seg}
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
  const color = STATUS_COLORS[status];
  const pct = count ? Math.max(Math.round((count / max) * 100), 8) : 0;

  return (
    <Link
      href={stageHref(status)}
      style={{ animationDelay: `${index * 70}ms` }}
      className="animate-rise flex flex-1 flex-col gap-2.5 rounded-xl border border-hairline bg-canvas p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:min-w-0"
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color.dot}`} />
        <span className="text-fine font-sans font-bold uppercase tracking-wider text-ink-mute">
          {STATUS_LABELS[status]}
        </span>
      </div>
      <span className={`font-display-md font-mono tabular-nums ${color.num}`}>
        {count}
      </span>
      <div className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className={`h-full rounded-full ${color.fill}`}
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
                aria-hidden="true"
                className="hidden shrink-0 items-center justify-center px-1.5 text-ink-mute md:flex"
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
        href={stageHref("REJECTED")}
        style={{ animationDelay: "280ms" }}
        className="animate-rise flex items-center justify-between rounded-xl border border-hairline bg-canvas px-4 py-3 transition-colors hover:bg-surface-hover"
      >
        <span className="flex items-center gap-2 text-fine font-sans font-bold uppercase tracking-wider text-ink-mute">
          <span className={`h-2 w-2 rounded-full ${STATUS_COLORS.REJECTED.dot}`} />
          Rejected
        </span>
        <span className="text-body-lg font-mono font-semibold tabular-nums text-ink-mute">
          {counts.REJECTED}
        </span>
      </Link>
    </div>
  );
}
