import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Sparkles, Plus } from "lucide-react";
import { requireSession } from "@/server/get-session";
import { formatDisplayDate, deadlineTone } from "@/lib/format";
import { DEADLINE_TONE_CLASS } from "@/components/ui/deadline";
import { getUpcomingDeadlines } from "@/server/data/applications";
import {
  getWeeklyActivity,
  getBestFitPerApplication,
  getPipelineSnapshot,
} from "@/server/data/insights";
import { getCoachState } from "@/server/data/users";
import { coachSnapshotHash, MIN_ANALYZED_FOR_COACH } from "@/server/coach";
import { coachAdviceSchema } from "@/lib/schemas/coach";
import { Pipeline } from "@/components/dashboard/pipeline";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { FitRanking } from "@/components/dashboard/fit-ranking";
import { SkillGapCard } from "@/components/dashboard/skill-gap-card";
import { PipelineCoach } from "@/components/dashboard/pipeline-coach";
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

async function ResumeFit({ userId }: { userId: string }) {
  const bestFit = await getBestFitPerApplication(userId);

  if (bestFit.length === 0) {
    return (
      <EmptyState className="flex-1 justify-center border-0 bg-transparent p-0">
        Analyze a job description and compute resume fit to see how your resumes
        stack up.
      </EmptyState>
    );
  }
  return <FitRanking points={bestFit} />;
}

function ResumeFitFallback() {
  return (
    <div className="flex flex-1 flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-6 animate-pulse rounded-md bg-hairline" />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();
  const userId = session.user.id;

  const [upcoming, weeklyActivity, snapshot, coachUser] = await Promise.all([
    getUpcomingDeadlines(userId),
    getWeeklyActivity(userId),
    getPipelineSnapshot(userId),
    getCoachState(userId),
  ]);

  const coachParsed = coachAdviceSchema.safeParse(coachUser?.coachAdvice);
  const advice = coachParsed.success ? coachParsed.data : null;
  const coachIsStale =
    advice !== null && coachUser?.coachHash !== coachSnapshotHash(snapshot);
  const canCoach = snapshot.analyzedCount >= MIN_ANALYZED_FOR_COACH;

  const counts = snapshot.statusCounts;
  const total = snapshot.total;
  const { rates } = snapshot;
  const pct = (rate: number | null) => (rate === null ? 0 : Math.round(rate * 100));
  const fmt = (rate: number | null) => (rate === null ? "—" : `${pct(rate)}%`);

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
              value={fmt(rates.responseRate)}
              pct={pct(rates.responseRate)}
              bar="bg-link-blue"
              hint={
                rates.applied
                  ? `of ${rates.applied} applied`
                  : "no applications yet"
              }
            />
            <Metric
              label="Interview rate"
              value={fmt(rates.interviewRate)}
              pct={pct(rates.interviewRate)}
              bar="bg-semantic-warning"
              hint="reached interview"
            />
            <Metric
              label="Offer rate"
              value={fmt(rates.offerRate)}
              pct={pct(rates.offerRate)}
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

          <section>
            <h2 className="mb-4 font-sans font-bold text-title text-ink">
              Activity
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-6 shadow-sm">
                <h3 className="font-sans text-body font-bold text-ink">
                  Weekly activity
                </h3>
                <p className="mb-4 mt-1 font-sans text-caption text-ink-mute">
                  Applications added, last 12 weeks
                </p>
                <ActivityChart weeks={weeklyActivity} />
              </Card>

              <Card className="flex flex-col p-6 shadow-sm">
                <h3 className="font-sans text-body font-bold text-ink">
                  Resume fit
                </h3>
                <p className="mb-4 mt-1 font-sans text-caption text-ink-mute">
                  Best resume match per application
                </p>
                <Suspense fallback={<ResumeFitFallback />}>
                  <ResumeFit userId={userId} />
                </Suspense>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-sans font-bold text-title text-ink">
              Coaching
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="flex flex-col p-6 shadow-sm">
                <h3 className="font-sans text-body font-bold text-ink">
                  Skills to focus on
                </h3>
                <p className="mb-4 mt-1 font-sans text-caption text-ink-mute">
                  Most common gaps across your analyzed roles
                </p>
                <SkillGapCard
                  gaps={snapshot.topMissingSkills}
                  analyzedCount={snapshot.analyzedCount}
                />
              </Card>

              <Card className="p-6 shadow-sm">
                <PipelineCoach
                  advice={advice}
                  generatedAt={coachUser?.coachAt?.toISOString() ?? null}
                  isStale={coachIsStale}
                  canGenerate={canCoach}
                />
              </Card>
            </div>
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
