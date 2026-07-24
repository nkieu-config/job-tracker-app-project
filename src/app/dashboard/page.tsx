import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/server/get-session";
import { formatDisplayDate } from "@/lib/format";
import {
  getUpcomingDeadlines,
  getAgendaRows,
} from "@/server/data/applications";
import {
  getWeeklyActivity,
  getBestFitPerApplication,
  getPipelineSnapshot,
} from "@/server/data/insights";
import { getCoachState } from "@/server/data/users";
import { coachSnapshotHash, MIN_ANALYZED_FOR_COACH } from "@/server/coach";
import { coachAdviceSchema } from "@/lib/schemas/coach";
import { buildAgenda } from "@/lib/agenda";
import { Agenda } from "@/components/dashboard/agenda";
import { Pipeline } from "@/components/dashboard/pipeline";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { FitRanking } from "@/components/dashboard/fit-ranking";
import { SkillGapCard } from "@/components/dashboard/skill-gap-card";
import { PipelineCoach } from "@/components/dashboard/pipeline-coach";
import { buttonClass } from "@/components/ui/button";
import { Card, cardClass } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Today",
};

const weekday = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

function Rate({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-hairline pl-4">
      <span className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
        {label}
      </span>
      <span className="font-mono text-[2rem] leading-none tabular-nums text-ink">
        {value}
      </span>
      <span className="font-sans text-caption text-ink-mute">{hint}</span>
    </div>
  );
}

async function ResumeFit({ userId }: { userId: string }) {
  const bestFit = await getBestFitPerApplication(userId);
  if (bestFit.length === 0) {
    return (
      <EmptyState className="flex-1 justify-center border-0 bg-transparent p-0">
        Read a posting and score your resumes to see how they stack up.
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

export default async function TodayPage() {
  const session = await requireSession();
  const userId = session.user.id;
  const now = new Date();

  const [upcoming, agendaRows, weeklyActivity, snapshot, coachUser] =
    await Promise.all([
      getUpcomingDeadlines(userId),
      getAgendaRows(userId),
      getWeeklyActivity(userId),
      getPipelineSnapshot(userId),
      getCoachState(userId),
    ]);

  const coachParsed = coachAdviceSchema.safeParse(coachUser?.coachAdvice);
  const advice = coachParsed.success ? coachParsed.data : null;
  const coachIsStale =
    advice !== null && coachUser?.coachHash !== coachSnapshotHash(snapshot);
  const canCoach = snapshot.analyzedCount >= MIN_ANALYZED_FOR_COACH;

  const agenda = buildAgenda(agendaRows, now);
  const total = snapshot.total;
  const { rates } = snapshot;
  const fmt = (rate: number | null) =>
    rate === null ? "—" : `${Math.round(rate * 100)}%`;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-caption uppercase tracking-wide text-ink-mute">
            {weekday.format(now)}
          </p>
          <h1 className="mt-1 font-serif text-[2rem] font-semibold leading-tight tracking-tight text-ink">
            {agenda.length === 0
              ? "Nothing is waiting on you"
              : `${agenda.length} thing${agenda.length === 1 ? "" : "s"} worth doing`}
          </h1>
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
        <div className={cardClass("flex flex-col gap-4 p-8")}>
          <h2 className="font-serif text-[1.5rem] font-semibold text-ink">
            Start with a posting
          </h2>
          <p className="max-w-prose font-sans text-body-lg text-ink-mute">
            Paste a job description and Applywise reads it against your resumes —
            highlighting what you already have, underlining what you are missing,
            and drafting the questions the posting implies.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/applications/new"
              className={buttonClass({})}
            >
              Add a posting
            </Link>
            <Link
              href="/dashboard/resumes"
              className={buttonClass({ variant: "outline" })}
            >
              Upload a resume first
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section>
            <Agenda items={agenda} />
          </section>

          <section>
            <PipelineCoach
              advice={advice}
              generatedAt={coachUser?.coachAt?.toISOString() ?? null}
              isStale={coachIsStale}
              canGenerate={canCoach}
            />
          </section>

          <section className="flex flex-col gap-5 border-t border-hairline pt-8">
            <h2 className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
              How the search is going
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <Rate
                label="Response"
                value={fmt(rates.responseRate)}
                hint={
                  rates.applied ? `of ${rates.applied} applied` : "none applied"
                }
              />
              <Rate
                label="Interview"
                value={fmt(rates.interviewRate)}
                hint="reached interview"
              />
              <Rate
                label="Offer"
                value={fmt(rates.offerRate)}
                hint={`${snapshot.statusCounts.OFFER} offer${
                  snapshot.statusCounts.OFFER === 1 ? "" : "s"
                }`}
              />
            </div>

            <Pipeline counts={snapshot.statusCounts} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h3 className="font-sans text-body font-bold text-ink">
                  Weekly activity
                </h3>
                <p className="mb-4 mt-1 font-sans text-caption text-ink-mute">
                  Applications added, last 12 weeks
                </p>
                <ActivityChart weeks={weeklyActivity} />
              </Card>

              <Card className="flex flex-col p-6">
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

            <Card className="p-6">
              <h3 className="font-sans text-body font-bold text-ink">
                Skills to focus on
              </h3>
              <p className="mb-4 mt-1 font-sans text-caption text-ink-mute">
                Most common gaps across the postings you have read
              </p>
              <SkillGapCard
                gaps={snapshot.topMissingSkills}
                analyzedCount={snapshot.analyzedCount}
              />
            </Card>
          </section>
        </>
      )}

      {upcoming.length > 0 && (
        <section className="border-t border-hairline pt-8">
          <h2 className="mb-4 font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
            Every deadline ahead
          </h2>
          <ul className="flex flex-col">
            {upcoming.map((app) => (
              <li
                key={app.id}
                className="border-t border-hairline first:border-t-0"
              >
                <Link
                  href={`/dashboard/applications/${app.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-surface-hover"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-body font-medium text-ink">
                      {app.role}
                    </span>
                    <span className="block truncate font-sans text-caption text-ink-mute">
                      {app.company}
                    </span>
                  </span>
                  {app.deadline && (
                    <span className="shrink-0 font-mono text-caption tabular-nums text-ink-mute">
                      {formatDisplayDate(app.deadline)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
