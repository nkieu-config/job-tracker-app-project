import Link from "next/link";
import { requireSession } from "@/lib/get-session";
import { formatDate } from "@/lib/format";
import { getStatusCounts, getUpcomingDeadlines } from "@/lib/data/applications";
import { Pipeline } from "./pipeline";
import { StatusBadge } from "./applications/status-badge";

function Metric({
  label,
  value,
  pct,
  bar,
  hint,
}: {
  label: string;
  value: string;
  pct: number;
  bar: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-semibold leading-none tabular-nums text-black dark:text-zinc-50">
        {value}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();
  const userId = session.user.id;

  const [counts, upcoming] = await Promise.all([
    getStatusCounts(userId),
    getUpcomingDeadlines(userId),
  ]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const applied =
    counts.APPLIED + counts.INTERVIEW + counts.OFFER + counts.REJECTED;
  const responded = counts.INTERVIEW + counts.OFFER + counts.REJECTED;
  const interviews = counts.INTERVIEW + counts.OFFER;
  const rate = (n: number) => (applied ? Math.round((n / applied) * 100) : 0);
  const fmt = (n: number) => (applied ? `${rate(n)}%` : "—");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Welcome, {session.user.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total === 0
              ? "Let’s track your first application."
              : `Tracking ${total} application${total === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Link
          href="/dashboard/applications/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          New application
        </Link>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            No applications yet.{" "}
            <Link
              href="/dashboard/applications/new"
              className="font-medium text-black underline-offset-4 hover:underline dark:text-zinc-50"
            >
              Add your first one
            </Link>{" "}
            to start building your pipeline.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-3">
            <Metric
              label="Response rate"
              value={fmt(responded)}
              pct={rate(responded)}
              bar="bg-blue-500"
              hint={applied ? `of ${applied} applied` : "no applications yet"}
            />
            <Metric
              label="Interview rate"
              value={fmt(interviews)}
              pct={rate(interviews)}
              bar="bg-amber-500"
              hint="reached interview"
            />
            <Metric
              label="Offer rate"
              value={fmt(counts.OFFER)}
              pct={rate(counts.OFFER)}
              bar="bg-green-500"
              hint={`${counts.OFFER} offer${counts.OFFER === 1 ? "" : "s"}`}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Pipeline
            </h2>
            <Pipeline counts={counts} />
          </section>
        </>
      )}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Upcoming deadlines
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No upcoming deadlines.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {upcoming.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/dashboard/applications/${app.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-black dark:text-zinc-50">
                      {app.role}
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      {app.company}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
                      {app.deadline ? formatDate(app.deadline) : null}
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
