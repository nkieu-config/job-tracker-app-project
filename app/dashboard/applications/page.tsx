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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display-md text-ink tracking-tight">
          Applications
        </h1>
        <Link
          href="/dashboard/applications/new"
          className="w-full sm:w-auto inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] tracking-[0.2px] py-[10px] px-[20px] rounded-[90px] transition-colors hover:bg-primary-press whitespace-nowrap"
        >
          New application
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {filters.map((f) => {
          const active = f.value === status || (!f.value && !status);
          const href = f.value
            ? `/dashboard/applications?status=${f.value}`
            : "/dashboard/applications";
          return (
            <Link
              key={f.label}
              href={href}
              className={`rounded-[90px] px-4 py-2 text-[14px] font-bold font-sans transition-colors ${
                active
                  ? "bg-primary text-on-primary"
                  : "bg-canvas text-ink border border-hairline hover:bg-canvas-lavender"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {applications.length === 0 ? (
        <div className="mt-4 rounded-[16px] border border-dashed border-hairline p-10 text-center text-[16px] font-sans text-ink-mute bg-canvas">
          No applications {status ? `with status “${STATUS_LABELS[status]}”` : "yet"}.{" "}
          <Link
            href="/dashboard/applications/new"
            className="font-bold text-link-blue underline-offset-4 hover:underline"
          >
            Add one
          </Link>
          .
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {applications.map((app) => (
            <li key={app.id}>
              <Link
                href={`/dashboard/applications/${app.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[12px] border border-hairline bg-canvas px-6 py-4 transition-shadow hover:shadow-[0_5px_20px_rgba(0,0,0,0.05)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-sans font-bold text-ink">
                    {app.role}
                  </p>
                  <p className="truncate font-sans text-[14px] text-ink-mute mt-1">{app.company}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-none border-hairline pt-3 sm:pt-0">
                  {app.deadline && (
                    <span className="font-sans text-[14px] font-medium tabular-nums text-ink-mute">
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
