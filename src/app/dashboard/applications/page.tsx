import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { requireSession } from "@/server/get-session";
import { formatDisplayDate, deadlineTone } from "@/lib/format";
import { DEADLINE_TONE_CLASS } from "@/components/ui/deadline";
import { getApplications } from "@/server/data/applications";
import { ListControls } from "@/components/applications/list-controls";
import {
  APPLICATION_SORTS,
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationSort,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { StatusBadge } from "@/components/applications/status-badge";
import {
  ApplicationsBoard,
  type BoardApplication,
} from "@/components/applications/board";
import { isOneOf } from "@/lib/guards";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  SegmentedControl,
  filterChipClass,
} from "@/components/ui/segmented-control";

export const metadata: Metadata = {
  title: "Applications",
};

const LIST_GRID =
  "grid grid-cols-[minmax(0,1fr)_84px_104px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_150px_130px] sm:gap-4";

function parseStatus(value?: string): ApplicationStatus | undefined {
  return isOneOf(APPLICATION_STATUSES, value) ? value : undefined;
}

function parseSort(value?: string): ApplicationSort {
  return isOneOf(APPLICATION_SORTS, value) ? value : "newest";
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
    deadline: app.deadline
      ? { label: formatDisplayDate(app.deadline), tone: deadlineTone(app.deadline) }
      : null,
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
          <SegmentedControl
            ariaLabel="View"
            items={[
              {
                label: "Board",
                href: "/dashboard/applications",
                active: view === "board",
              },
              {
                label: "List",
                href: "/dashboard/applications?view=list",
                active: view === "list",
              },
            ]}
          />
          <Link
            href="/dashboard/applications/new"
            className={buttonClass()}
          >
            New application
          </Link>
        </div>
      </div>

      {view === "board" ? (
        applications.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={
              <Briefcase size={32} className="text-ink-mute" aria-hidden="true" />
            }
            title="No applications yet"
            action={
              <Link
                href="/dashboard/applications/new"
                className={buttonClass()}
              >
                New application
              </Link>
            }
          >
            Track your first job application — add the role, paste the job
            description, and let AI do the rest.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            <ApplicationsBoard applications={boardApplications} />
            <p className="font-sans text-caption text-ink-mute">
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
                  className={filterChipClass({ active })}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          {applications.length === 0 ? (
            query ? (
              <EmptyState className="mt-4">
                No applications match “{query}”.
              </EmptyState>
            ) : (
              <EmptyState
                className="mt-4"
                icon={
                  <Briefcase
                    size={32}
                    className="text-ink-mute"
                    aria-hidden="true"
                  />
                }
                title={
                  status
                    ? `No ${STATUS_LABELS[status].toLowerCase()} applications`
                    : "No applications yet"
                }
                action={
                  <Link
                    href="/dashboard/applications/new"
                    className={buttonClass()}
                  >
                    New application
                  </Link>
                }
              >
                {status
                  ? "Nothing here with this status yet."
                  : "Add your first application to get started."}
              </EmptyState>
            )
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-hairline bg-canvas">
              <div className="min-w-0">
                <div
                  className={`${LIST_GRID} border-b border-hairline px-4 py-2.5`}
                >
                  <span className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
                    Role
                  </span>
                  <span className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
                    Status
                  </span>
                  <span className="text-right font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
                    Deadline
                  </span>
                </div>
                <ul>
                  {applications.map((app) => {
                    const tone = app.deadline ? deadlineTone(app.deadline) : null;
                    return (
                      <li key={app.id}>
                        <Link
                          href={`/dashboard/applications/${app.id}`}
                          className={`group ${LIST_GRID} border-b border-hairline px-4 py-3 transition-colors last:border-0 hover:bg-canvas-lavender`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-sans text-body font-bold text-ink group-hover:text-primary-ink">
                              {app.role}
                            </p>
                            <p className="truncate font-sans text-caption text-ink-mute">
                              {app.company}
                            </p>
                          </div>
                          <StatusBadge status={app.status} />
                          <span
                            className={`text-right font-mono text-caption tabular-nums ${
                              tone ? DEADLINE_TONE_CLASS[tone] : "text-ink-mute"
                            }`}
                          >
                            {app.deadline ? formatDisplayDate(app.deadline) : "—"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
