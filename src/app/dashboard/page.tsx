import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Plus } from "lucide-react";
import { requireSession } from "@/server/get-session";
import { formatDisplayDate, deadlineTone } from "@/lib/format";
import { DEADLINE_TONE_CLASS } from "@/components/ui/deadline";
import { getStatusCounts, getUpcomingDeadlines } from "@/server/data/applications";
import { Pipeline } from "@/components/dashboard/pipeline";
import { StatusBadge } from "@/components/applications/status-badge";
import { buttonClass } from "@/components/ui/button";
import { Card, cardClass } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Dashboard",
};

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
    <Card className="p-8 shadow-sm">
      <p className="text-body font-sans font-medium text-ink-mute">
        {label}
      </p>
      <p className="mt-2 font-display-lg font-mono tabular-nums text-primary">
        {value}
      </p>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-body font-sans text-ink-mute">{hint}</p>
    </Card>
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
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display-md text-ink tracking-tight">
            Welcome, {session.user.name}
          </h1>
          <p className="mt-2 font-sans text-body-lg text-ink-mute">
            {total === 0
              ? "Let’s track your first application."
              : `Tracking ${total} application${total === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Link
          href="/dashboard/applications/new"
          className={buttonClass({ size: "lg", className: "w-full sm:w-auto" })}
        >
          <Plus size={18} aria-hidden="true" />
          New application
        </Link>
      </div>

      {total === 0 ? (
        <div className={cardClass("flex flex-col gap-6 p-8 shadow-sm")}>
          <div>
            <h2 className="font-display-sm text-ink">Welcome to your Job Tracker!</h2>
            <p className="mt-2 font-sans text-body-lg text-ink-mute">Follow these 3 simple steps to let AI power your job search.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-3 rounded-xl bg-canvas-lavender p-6 border border-hairline">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary font-bold">1</span>
              <h3 className="font-sans font-bold text-ink text-body-lg">Upload Base Resume</h3>
              <p className="font-sans text-body text-ink-mute flex-1">Upload your PDF resumes. We&apos;ll use these to compare against jobs.</p>
              <Link href="/dashboard/resumes" className="text-body text-link-blue font-bold hover:underline self-start mt-2">Go to Resumes →</Link>
            </div>
            <div className="flex flex-col gap-3 rounded-xl bg-canvas-lavender p-6 border border-hairline">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary font-bold">2</span>
              <h3 className="font-sans font-bold text-ink text-body-lg">Track a Job</h3>
              <p className="font-sans text-body text-ink-mute flex-1">Add a new application and <b>paste the Job Description</b>.</p>
              <Link href="/dashboard/applications/new" className="text-body text-link-blue font-bold hover:underline self-start mt-2">New application →</Link>
            </div>
            <div className="flex flex-col gap-3 rounded-xl bg-canvas-lavender p-6 border border-hairline">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-semantic-warning-tint text-semantic-warning">
                <Sparkles size={16} aria-hidden="true" />
              </span>
              <h3 className="font-sans font-bold text-ink text-body-lg">Let AI Do the Work</h3>
              <p className="font-sans text-body text-ink-mute flex-1">Open your application to let AI automatically score your fit and identify missing skills.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Metric
              label="Response rate"
              value={fmt(responded)}
              pct={rate(responded)}
              bar="bg-link-blue"
              hint={applied ? `of ${applied} applied` : "no applications yet"}
            />
            <Metric
              label="Interview rate"
              value={fmt(interviews)}
              pct={rate(interviews)}
              bar="bg-semantic-warning"
              hint="reached interview"
            />
            <Metric
              label="Offer rate"
              value={fmt(counts.OFFER)}
              pct={rate(counts.OFFER)}
              bar="bg-semantic-success"
              hint={`${counts.OFFER} offer${counts.OFFER === 1 ? "" : "s"}`}
            />
          </section>

          <section>
            <h2 className="mb-4 font-sans font-bold text-title text-ink">
              Pipeline
            </h2>
            <Pipeline counts={counts} />
          </section>
        </>
      )}

      <section>
        <h2 className="mb-4 font-sans font-bold text-title text-ink">
          Upcoming deadlines
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState className="p-8">No upcoming deadlines.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/dashboard/applications/${app.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-canvas px-6 py-4 transition-shadow hover:shadow-[0_5px_20px_rgba(0,0,0,0.05)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-sans font-bold text-ink">
                      {app.role}
                    </p>
                    <p className="truncate font-sans text-body text-ink-mute mt-1">
                      {app.company}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {app.deadline && (
                      <span
                        className={`font-mono text-caption tabular-nums ${DEADLINE_TONE_CLASS[deadlineTone(app.deadline)]}`}
                      >
                        {formatDisplayDate(app.deadline)}
                      </span>
                    )}
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
