import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/get-session";
import { formatDisplayDate, deadlineTone } from "@/lib/format";
import { getApplication } from "@/server/data/applications";
import { getResumeTextMeta } from "@/server/data/resumes";
import { storedJdAnalysisSchema } from "@/lib/schemas/jd-analysis";
import { analysisCacheHash } from "@/server/analysis-cache";
import { resolveSkillGap } from "@/server/skill-gap";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DEADLINE_TONE_CLASS } from "@/components/ui/deadline";
import { getResumeFitScores } from "@/server/data/embeddings";
import { StatusBadge } from "@/components/applications/status-badge";
import { DeleteApplicationButton } from "@/components/applications/delete-application-button";
import { Desk, type DeskTab } from "@/components/applications/desk";
import { MatchPanel } from "@/components/applications/match-panel";
import { TailorBullets } from "@/components/applications/tailor-bullets";
import { InterviewPrep } from "@/components/applications/interview-prep";
import { PostingPane } from "@/components/applications/posting-pane";
import { MarkedPosting } from "@/components/applications/marked-posting";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await requireSession();
  const application = await getApplication(id, session.user.id);

  if (!application) {
    return { title: "Application not found" };
  }
  return { title: `${application.role} at ${application.company}` };
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const userId = session.user.id;

  // These three reads are independent (each keyed only by userId/id), so run
  // them in parallel instead of waterfalling three DB round-trips.
  const [application, resumes, fitScores] = await Promise.all([
    getApplication(id, userId),
    getResumeTextMeta(userId),
    getResumeFitScores(id, userId),
  ]);

  if (!application) {
    notFound();
  }

  // Parse the stored AI analysis (it was validated before saving, but the DB
  // column is untyped JSON, so validate again on the way out).
  const analysisResult = storedJdAnalysisSchema.safeParse(application.analysis);
  const analysis = analysisResult.success ? analysisResult.data : null;

  const gap = await resolveSkillGap(analysis, userId);
  const hasJd = Boolean(application.jobDescription?.trim());

  const resumesChangedSinceAnalysis =
    analysis?.skillMatches !== undefined &&
    application.analyzedAt !== null &&
    resumes.some((r) => r.createdAt > application.analyzedAt!);
  const jdChangedSinceAnalysis =
    analysis !== null &&
    hasJd &&
    application.analysisHash !== null &&
    application.analysisHash !==
      analysisCacheHash(application.jobDescription!.trim());
  const staleNotice = jdChangedSinceAnalysis
    ? "This posting changed after the last read — read it again to refresh."
    : resumesChangedSinceAnalysis
      ? "You’ve uploaded resumes since this read — read it again to refresh the matching."
      : null;

  const deadlineToneValue = application.deadline
    ? deadlineTone(application.deadline)
    : null;

  // Only required skills are marked. A nice-to-have is not something the
  // posting demands of you, so highlighting it would say something the data
  // does not.
  const postingSkills = analysis
    ? analysis.requiredSkills.map((skill) => ({
        skill,
        matched: Boolean(gap?.matched.includes(skill)),
      }))
    : [];

  const tabs: DeskTab[] = [
    {
      id: "match",
      label: "Match",
      panel: (
        <MatchPanel
          applicationId={application.id}
          hasJd={hasJd}
          analysis={analysis}
          gap={gap}
          resumeCount={resumes.length}
          fitScores={fitScores}
          anyResumeHasText={resumes.some((r) => r.hasText)}
          staleNotice={staleNotice}
        />
      ),
    },
    ...(hasJd
      ? [
          {
            id: "tailor",
            label: "Tailor",
            panel: (
              <div className="flex flex-col gap-3">
                <p className="font-sans text-caption leading-relaxed text-ink-mute">
                  Paste an experience and the AI rewrites it as bullets tuned to
                  this posting — streamed live.
                </p>
                <TailorBullets
                  id={application.id}
                  initialExperience={application.tailoredExperience ?? ""}
                  initialOutput={application.tailoredBullets ?? ""}
                />
              </div>
            ),
          },
          {
            id: "prep",
            label: "Prep",
            panel: (
              <div className="flex flex-col gap-3">
                <p className="font-sans text-caption leading-relaxed text-ink-mute">
                  Likely technical and behavioural questions for this posting,
                  with what a strong answer covers.
                </p>
                <InterviewPrep
                  id={application.id}
                  initialOutput={application.interviewPrep ?? ""}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  // Which tab opens is decided by where this application actually is. A prep
  // sheet is noise before anyone has offered you an interview, and tailoring
  // bullets is beside the point once they have.
  const initialTabId =
    hasJd && application.status === "INTERVIEW" ? "prep" : "match";

  const posting = (
    <PostingPane clampable={hasJd}>
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
            Job posting
          </h2>
          {hasJd ? (
            <div className="mt-3">
              <MarkedPosting
                text={application.jobDescription!}
                skills={postingSkills}
              />
            </div>
          ) : (
            <div className="mt-3">
              <EmptyState className="p-8">
                No posting saved yet. Add it and every AI feature on this page
                turns on.
              </EmptyState>
              <Link
                href={`/dashboard/applications/${application.id}/edit`}
                className={buttonClass({
                  variant: "outline",
                  size: "sm",
                  className: "mt-3",
                })}
              >
                Add the posting
              </Link>
            </div>
          )}
        </section>

        {application.notes && (
          <section className="border-t border-hairline pt-6">
            <h2 className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
              Your notes
            </h2>
            <p className="mt-3 whitespace-pre-wrap font-serif text-body leading-relaxed text-ink">
              {application.notes}
            </p>
          </section>
        )}
      </div>
    </PostingPane>
  );

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link
          href="/dashboard/applications"
          className="font-sans text-caption font-medium text-ink-mute transition-colors hover:text-ink"
        >
          ← Applications
        </Link>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-ink">
              {application.role}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-sans text-body-lg text-ink-mute">
                {application.company}
              </span>
              <StatusBadge status={application.status} />
              <span
                className={`font-mono text-caption tabular-nums ${
                  deadlineToneValue
                    ? DEADLINE_TONE_CLASS[deadlineToneValue]
                    : "text-ink-mute"
                }`}
              >
                {application.deadline
                  ? formatDisplayDate(application.deadline)
                  : "No deadline"}
              </span>
              {application.jobUrl && (
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-caption font-medium text-link-blue underline-offset-4 transition-colors hover:text-link-hover hover:underline"
                >
                  Original posting ↗
                </a>
              )}
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link
              href={`/dashboard/applications/${application.id}/edit`}
              className={buttonClass({
                variant: "secondary",
                className: "flex-1 sm:flex-none",
              })}
            >
              Edit
            </Link>
            <div className="flex-1 *:w-full sm:flex-none">
              <DeleteApplicationButton id={application.id} />
            </div>
          </div>
        </div>
      </div>

      <Desk posting={posting} tabs={tabs} initialTabId={initialTabId} />
    </div>
  );
}
