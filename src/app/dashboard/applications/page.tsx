import Link from "next/link";
import { requireSession } from "@/lib/get-session";
import { formatDisplayDate } from "@/lib/format";
import {
  getApplications,
  APPLICATION_SORTS,
  type ApplicationSort,
} from "@/lib/data/applications";
import { ListControls } from "@/components/applications/list-controls";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { StatusBadge } from "@/components/applications/status-badge";
import {
  ApplicationsBoard,
  type BoardApplication,
} from "@/components/applications/board";

function parseStatus(value?: string): ApplicationStatus | undefined {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : undefined;
}

function parseSort(value?: string): ApplicationSort {
  return APPLICATION_SORTS.includes(value as ApplicationSort)
    ? (value as ApplicationSort)
    : "newest";
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    view?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const session = await requireSession();
  const userId = session.user.id;

  const {
    status: statusParam,
    view: viewParam,
    q: queryParam,
    sort: sortParam,
  } = await searchParams;
  const view = viewParam === "list" ? "list" : "board";
  const status = view === "list" ? parseStatus(statusParam) : undefined;
  const query = view === "list" ? (queryParam ?? "").trim() : "";
  const sort = view === "list" ? parseSort(sortParam) : "newest";
  const applications = await getApplications(userId, {
    status,
    query: query || undefined,
    sort,
  });

  const boardApplications: BoardApplication[] = applications.map((app) => ({
    id: app.id,
    role: app.role,
    company: app.company,
    status: app.status,
    deadline: app.deadline ? formatDisplayDate(app.deadline) : null,
  }));

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
        <div className="flex items-center gap-3">
          <nav
            aria-label="View"
            className="flex rounded-pill border border-hairline bg-canvas p-1"
          >
            <Link
              href="/dashboard/applications"
              aria-current={view === "board" ? "page" : undefined}
              className={`rounded-pill px-4 py-1.5 font-sans text-[14px] font-bold transition-colors ${
                view === "board"
                  ? "bg-primary text-on-primary"
                  : "text-ink hover:bg-canvas-lavender"
              }`}
            >
              Board
            </Link>
            <Link
              href="/dashboard/applications?view=list"
              aria-current={view === "list" ? "page" : undefined}
              className={`rounded-pill px-4 py-1.5 font-sans text-[14px] font-bold transition-colors ${
                view === "list"
                  ? "bg-primary text-on-primary"
                  : "text-ink hover:bg-canvas-lavender"
              }`}
            >
              List
            </Link>
          </nav>
          <Link
            href="/dashboard/applications/new"
            className="inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] tracking-[0.2px] py-2.5 px-5 rounded-pill transition-colors hover:bg-primary-press whitespace-nowrap"
          >
            New application
          </Link>
        </div>
      </div>

      {view === "board" ? (
        applications.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-hairline p-10 text-center text-[16px] font-sans text-ink-mute bg-canvas">
            No applications yet.{" "}
            <Link
              href="/dashboard/applications/new"
              className="font-bold text-link-blue underline-offset-4 hover:underline"
            >
              Add one
            </Link>
            .
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <ApplicationsBoard applications={boardApplications} />
            <p className="font-sans text-[13px] text-ink-mute">
              Drag a card between columns to update its status.
            </p>
          </div>
        )
      ) : (
        <>
          <ListControls query={query} sort={sort} status={status} />
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const active = f.value === status || (!f.value && !status);
              const params = new URLSearchParams({ view: "list" });
              if (f.value) params.set("status", f.value);
              if (query) params.set("q", query);
              if (sort !== "newest") params.set("sort", sort);
              const href = `/dashboard/applications?${params.toString()}`;
              return (
                <Link
                  key={f.label}
                  href={href}
                  className={`rounded-pill px-4 py-2 text-[14px] font-bold font-sans transition-colors ${
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
            <div className="mt-4 rounded-2xl border border-dashed border-hairline p-10 text-center text-[16px] font-sans text-ink-mute bg-canvas">
              {query ? (
                <>No applications match “{query}”.</>
              ) : (
                <>
                  No applications{" "}
                  {status ? `with status “${STATUS_LABELS[status]}”` : "yet"}.{" "}
                  <Link
                    href="/dashboard/applications/new"
                    className="font-bold text-link-blue underline-offset-4 hover:underline"
                  >
                    Add one
                  </Link>
                  .
                </>
              )}
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {applications.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/dashboard/applications/${app.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-hairline bg-canvas px-6 py-4 transition-shadow hover:shadow-[0_5px_20px_rgba(0,0,0,0.05)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-sans font-bold text-ink">
                        {app.role}
                      </p>
                      <p className="truncate font-sans text-[14px] text-ink-mute mt-1">
                        {app.company}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-none border-hairline pt-3 sm:pt-0">
                      {app.deadline && (
                        <span className="font-sans text-[14px] font-medium tabular-nums text-ink-mute">
                          Due {formatDisplayDate(app.deadline)}
                        </span>
                      )}
                      <StatusBadge status={app.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
