import Link from "next/link";
import { Sparkles, Plus } from "lucide-react";
import { requireSession } from "@/lib/get-session";
import { formatDisplayDate } from "@/lib/format";
import { getStatusCounts, getUpcomingDeadlines } from "@/lib/data/applications";
import { Pipeline } from "@/components/dashboard/pipeline";
import { StatusBadge } from "@/components/applications/status-badge";

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
    <div className="rounded-2xl border border-hairline bg-canvas p-8 shadow-sm">
      <p className="text-[14px] font-sans font-medium text-ink-mute">
        {label}
      </p>
      <p className="mt-2 font-display-lg text-primary tabular-nums">
        {value}
      </p>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-[14px] font-sans text-ink-mute">{hint}</p>
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
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display-md text-ink tracking-tight">
            Welcome, {session.user.name}
          </h1>
          <p className="mt-2 font-sans text-[16px] text-ink-mute">
            {total === 0
              ? "Let’s track your first application."
              : `Tracking ${total} application${total === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Link
          href="/dashboard/applications/new"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-sans font-bold text-[16px] tracking-[0.2px] py-3.5 px-7 rounded-pill transition-colors hover:bg-primary-press whitespace-nowrap"
        >
          <Plus size={18} aria-hidden="true" />
          New application
        </Link>
      </div>

      {total === 0 ? (
        <div className="flex flex-col gap-6 rounded-2xl border border-hairline bg-canvas p-8 shadow-sm">
          <div>
            <h2 className="font-display-md text-ink text-[24px]">Welcome to your Job Tracker!</h2>
            <p className="mt-2 font-sans text-[16px] text-ink-mute">Follow these 3 simple steps to let AI power your job search.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-3 rounded-xl bg-canvas-lavender p-6 border border-hairline">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary font-bold">1</span>
              <h3 className="font-sans font-bold text-ink text-[16px]">Upload Base Resume</h3>
              <p className="font-sans text-[14px] text-ink-mute flex-1">Upload your PDF resumes. We&apos;ll use these to compare against jobs.</p>
              <Link href="/dashboard/resumes" className="text-[14px] text-link-blue font-bold hover:underline self-start mt-2">Go to Resumes →</Link>
            </div>
            <div className="flex flex-col gap-3 rounded-xl bg-canvas-lavender p-6 border border-hairline">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary font-bold">2</span>
              <h3 className="font-sans font-bold text-ink text-[16px]">Track a Job</h3>
              <p className="font-sans text-[14px] text-ink-mute flex-1">Add a new application and <b>paste the Job Description</b>.</p>
              <Link href="/dashboard/applications/new" className="text-[14px] text-link-blue font-bold hover:underline self-start mt-2">New application →</Link>
            </div>
            <div className="flex flex-col gap-3 rounded-xl bg-canvas-lavender p-6 border border-hairline">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-semantic-warning-tint text-semantic-warning">
                <Sparkles size={16} aria-hidden="true" />
              </span>
              <h3 className="font-sans font-bold text-ink text-[16px]">Let AI Do the Work</h3>
              <p className="font-sans text-[14px] text-ink-mute flex-1">Open your application to let AI automatically score your fit and identify missing skills.</p>
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
            <h2 className="mb-4 font-sans font-bold text-[18px] text-ink">
              Pipeline
            </h2>
            <Pipeline counts={counts} />
          </section>
        </>
      )}

      <section>
        <h2 className="mb-4 font-sans font-bold text-[18px] text-ink">
          Upcoming deadlines
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-hairline p-8 text-center font-sans text-[16px] text-ink-mute bg-canvas">
            No upcoming deadlines.
          </p>
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
                    <p className="truncate font-sans text-[14px] text-ink-mute mt-1">
                      {app.company}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="font-sans text-[14px] font-medium tabular-nums text-ink-mute">
                      {app.deadline ? formatDisplayDate(app.deadline) : null}
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
