import Link from "next/link";
import { getSession } from "@/lib/get-session";
import { getStatusCounts, getUpcomingDeadlines } from "@/lib/data/applications";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
} from "@/lib/validations/application";
import { StatusBadge } from "./applications/status-badge";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [counts, upcoming] = await Promise.all([
    getStatusCounts(userId),
    getUpcomingDeadlines(userId),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Welcome, {session!.user.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} application{total === 1 ? "" : "s"} tracked.
          </p>
        </div>
        <Link
          href="/dashboard/applications/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          New application
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {APPLICATION_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/dashboard/applications?status=${s}`}
            className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <p className="text-2xl font-semibold text-black dark:text-zinc-50">
              {counts[s]}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {STATUS_LABELS[s]}
            </p>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Upcoming deadlines
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No upcoming deadlines.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {upcoming.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/dashboard/applications/${app.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
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
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {app.deadline?.toISOString().slice(0, 10)}
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
