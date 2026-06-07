import Link from "next/link";
import { requireSession } from "@/lib/get-session";
import { formatDate } from "@/lib/format";
import { getApplications } from "@/lib/data/applications";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/validations/application";
import { StatusBadge } from "./status-badge";

function parseStatus(value?: string): ApplicationStatus | undefined {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : undefined;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  // userId is guaranteed by the layout guard; assert for the query.
  const userId = session.user.id;

  const { status: statusParam } = await searchParams;
  const status = parseStatus(statusParam);
  const applications = await getApplications(userId, status);

  const filters: { label: string; value?: ApplicationStatus }[] = [
    { label: "All" },
    ...APPLICATION_STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: s })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Applications
        </h1>
        <Link
          href="/dashboard/applications/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          New application
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = f.value === status || (!f.value && !status);
          const href = f.value
            ? `/dashboard/applications?status=${f.value}`
            : "/dashboard/applications";
          return (
            <Link
              key={f.label}
              href={href}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                active
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {applications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No applications {status ? `with status “${STATUS_LABELS[status]}”` : "yet"}.{" "}
          <Link
            href="/dashboard/applications/new"
            className="font-medium text-black underline-offset-4 hover:underline dark:text-zinc-50"
          >
            Add one
          </Link>
          .
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {applications.map((app) => (
            <li key={app.id}>
              <Link
                href={`/dashboard/applications/${app.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-black dark:text-zinc-50">
                    {app.role}
                  </p>
                  <p className="truncate text-sm text-zinc-500">{app.company}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {app.deadline && (
                    <span className="hidden text-xs text-zinc-500 sm:inline">
                      Due {formatDate(app.deadline)}
                    </span>
                  )}
                  <StatusBadge status={app.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
