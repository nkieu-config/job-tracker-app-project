import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/get-session";
import { formatDisplayDate, deadlineTone } from "@/lib/format";
import { getApplication } from "@/server/data/applications";
import { getResumeText, getResumeTextMeta } from "@/server/data/resumes";
import { storedJdAnalysisSchema } from "@/lib/schemas/jd-analysis";
import { analysisCacheHash } from "@/server/analysis-cache";
import { matchSkills } from "@/lib/skills";
import { fitBand } from "@/components/ui/fit-score";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, badgeClass, Dot } from "@/components/ui/badge";
import { DEADLINE_TONE_CLASS } from "@/components/ui/deadline";
import { SectionNav, type Section } from "@/components/applications/section-nav";
import { getResumeFitScores } from "@/server/data/embeddings";
import { Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/applications/status-badge";
import { DeleteApplicationButton } from "@/components/applications/delete-application-button";
import { AnalyzeButton } from "@/components/applications/analyze-button";
import { ComputeFitButton } from "@/components/applications/compute-fit-button";
import { TailorBullets } from "@/components/applications/tailor-bullets";
import { InterviewPrep } from "@/components/applications/interview-prep";

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

  // `skillMatches` is stored by the analyzer, so the normal path already knows
  // the answer. Only an analysis predating that field falls back to lexical
  // matching here — the one case that needs the resume text itself, and the one
  // case worth a second round-trip for it.
  const gap = analysis
    ? analysis.skillMatches
      ? {
          matched: analysis.requiredSkills.filter((s) =>
            analysis.skillMatches?.includes(s),
          ),
          missing: analysis.requiredSkills.filter(
            (s) => !analysis.skillMatches?.includes(s),
          ),
        }
      : matchSkills(analysis.requiredSkills, await getResumeText(userId))
    : null;
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
  const staleAnalysisNotice = jdChangedSinceAnalysis
    ? "This analysis no longer matches the current job description — re-analyze to refresh it."
    : resumesChangedSinceAnalysis
      ? "You’ve uploaded resumes since this analysis — re-analyze to refresh the skill matching."
      : null;
  const sections: Section[] = [
    ...(application.jobDescription
      ? [{ id: "job-description", label: "Job description" }]
      : []),
    { id: "skills-analysis", label: "Skills analysis" },
    { id: "resume-fit", label: "Resume fit" },
    ...(hasJd
      ? [
          { id: "tailor-bullets", label: "Tailor bullets" },
          { id: "interview-prep", label: "Interview prep" },
        ]
      : []),
    ...(application.notes ? [{ id: "notes", label: "Notes" }] : []),
  ];

  const deadlineToneValue = application.deadline
    ? deadlineTone(application.deadline)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard/applications"
          className="font-sans text-caption font-medium text-ink-mute transition-colors hover:text-ink"
        >
          ← Applications
        </Link>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="font-display-md text-ink tracking-tight">
              {application.role}
            </h1>
            <p className="mt-1 font-sans text-body-lg text-ink-mute">
              {application.company}
            </p>
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

      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <dl className="flex flex-col gap-5">
            <div>
              <dt className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
                Status
              </dt>
              <dd className="mt-1.5">
                <StatusBadge status={application.status} />
              </dd>
            </div>
            <div>
              <dt className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
                Deadline
              </dt>
              <dd
                className={`mt-1.5 font-mono text-body tabular-nums ${
                  deadlineToneValue
                    ? DEADLINE_TONE_CLASS[deadlineToneValue]
                    : "text-ink-mute"
                }`}
              >
                {application.deadline
                  ? formatDisplayDate(application.deadline)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
                Job URL
              </dt>
              <dd className="mt-1.5">
                {application.jobUrl ? (
                  <a
                    href={application.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-sans text-caption font-medium text-link-blue underline-offset-4 transition-colors hover:text-link-hover hover:underline"
                  >
                    {application.jobUrl}
                  </a>
                ) : (
                  <span className="font-sans text-caption text-ink-mute">—</span>
                )}
              </dd>
            </div>
          </dl>
          <SectionNav sections={sections} />
        </aside>

        <div className="flex flex-col divide-y divide-hairline">
          {application.jobDescription && (
            <section id="job-description" className="scroll-mt-8 py-8 first:pt-0">
              <h2 className="font-sans text-title font-semibold text-ink">
                Job description
              </h2>
              <p className="mt-3 whitespace-pre-wrap font-sans text-body leading-relaxed text-ink">
                {application.jobDescription}
              </p>
            </section>
          )}

          <section
            id="skills-analysis"
            className="flex scroll-mt-8 flex-col gap-4 py-8 first:pt-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-sans text-title font-semibold text-ink">
                Skills analysis
              </h2>
              {application.jobDescription?.trim() && (
                <div className="w-full sm:w-auto">
                  <AnalyzeButton
                    id={application.id}
                    label={analysis ? "Re-analyze" : "Analyze job description"}
                  />
                </div>
              )}
            </div>

            {!application.jobDescription?.trim() ? (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-hairline bg-canvas-lavender p-6">
                <Sparkles size={20} className="text-primary" aria-hidden="true" />
                <p className="font-sans text-body font-semibold text-ink">
                  Unlock AI skills analysis
                </p>
                <p className="font-sans text-caption text-ink-mute">
                  Add the job description and AI extracts the required skills,
                  seniority, and the gaps against your resume.
                </p>
                <Link
                  href={`/dashboard/applications/${application.id}/edit`}
                  className={buttonClass({
                    variant: "outline",
                    size: "sm",
                    className: "mt-1",
                  })}
                >
                  Add job description
                </Link>
              </div>
            ) : !analysis ? (
              <EmptyState className="p-8">
                Not analyzed yet — run “Analyze job description”.
              </EmptyState>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="font-sans text-body leading-relaxed text-ink">
                    {analysis.summary}
                  </p>
                  <p className="mt-2 font-sans text-caption text-ink-mute">
                    Seniority:{" "}
                    <span className="font-semibold text-ink">
                      {analysis.seniority}
                    </span>
                  </p>
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
                      Required skills
                    </h3>
                    {gap && resumes.length > 0 && (
                      <span className="font-mono text-caption tabular-nums text-ink-mute">
                        {gap.matched.length}/{analysis.requiredSkills.length}{" "}
                        matched
                      </span>
                    )}
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {analysis.requiredSkills.map((skill) => {
                      const matched = gap?.matched.includes(skill);
                      const tone =
                        resumes.length === 0
                          ? "neutral"
                          : matched
                            ? "success"
                            : "error";
                      return (
                        <li
                          key={skill}
                          className={badgeClass({ tone, size: "sm" })}
                        >
                          {skill}
                          {resumes.length > 0 && (matched ? " ✓" : " ✗")}
                        </li>
                      );
                    })}
                  </ul>
                  {resumes.length === 0 && (
                    <p className="mt-2 font-sans text-caption text-ink-mute">
                      Upload a resume to see which skills you’re missing.
                    </p>
                  )}
                </div>

                {analysis.niceToHave.length > 0 && (
                  <div>
                    <h3 className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
                      Nice to have
                    </h3>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {analysis.niceToHave.map((skill) => (
                        <li
                          key={skill}
                          className={badgeClass({ tone: "neutral", size: "sm" })}
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {gap && resumes.length > 0 && gap.missing.length > 0 && (
                  <p className="font-sans text-caption text-ink-mute">
                    <span className="font-semibold text-ink">Gap:</span> consider
                    adding {gap.missing.join(", ")} to your resume.
                  </p>
                )}

                {staleAnalysisNotice && (
                  <p className="rounded-lg bg-semantic-warning-tint px-3 py-2 font-sans text-caption font-medium text-ink">
                    {staleAnalysisNotice}
                  </p>
                )}
              </div>
            )}
          </section>

          <section
            id="resume-fit"
            className="flex scroll-mt-8 flex-col gap-4 py-8 first:pt-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-sans text-title font-semibold text-ink">
                Resume fit
              </h2>
              {application.jobDescription?.trim() && (
                <div className="w-full sm:w-auto">
                  <ComputeFitButton
                    id={application.id}
                    label={
                      fitScores.length ? "Recompute fit" : "Compute resume fit"
                    }
                  />
                </div>
              )}
            </div>

            {!application.jobDescription?.trim() ? (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-hairline bg-canvas-lavender p-6">
                <Sparkles size={20} className="text-primary" aria-hidden="true" />
                <p className="font-sans text-body font-semibold text-ink">
                  Unlock AI fit scoring
                </p>
                <p className="font-sans text-caption text-ink-mute">
                  Add the job description to rank your uploaded resumes and find
                  your best match.
                </p>
              </div>
            ) : fitScores.length === 0 ? (
              <EmptyState className="p-8">
                {resumes.some((r) => r.hasText)
                  ? "No fit scores yet — run “Compute resume fit” to rank your resumes against this JD."
                  : "Upload a resume with readable text, then compute fit."}
              </EmptyState>
            ) : (
              <div className="flex flex-col gap-3">
                <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
                  {fitScores.map((fit, i) => {
                    const band = fitBand(fit.score);
                    return (
                      <li
                        key={fit.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Dot tone={band.tone} />
                          <Link
                            href={`/dashboard/resumes/${fit.id}`}
                            className="truncate font-sans text-body font-medium text-link-blue underline-offset-4 hover:text-link-hover hover:underline"
                          >
                            {fit.label}
                          </Link>
                          {i === 0 && fitScores.length > 1 && (
                            <Badge tone="primary" size="sm">
                              Best
                            </Badge>
                          )}
                        </div>
                        <div className="flex shrink-0 items-baseline gap-3">
                          <span className="hidden font-sans text-fine text-ink-mute sm:inline">
                            {band.label}
                          </span>
                          <span className="font-mono text-body-lg font-semibold tabular-nums text-ink">
                            {Math.round(fit.score * 100)}%
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="font-sans text-caption leading-relaxed text-ink-mute">
                  Scores are the cosine similarity between this job description
                  and each resume&rsquo;s embedding, computed in Postgres with
                  pgvector — relative, not a hiring probability.
                </p>
              </div>
            )}
          </section>

          {application.jobDescription?.trim() && (
            <section
              id="tailor-bullets"
              className="flex scroll-mt-8 flex-col gap-3 py-8 first:pt-0"
            >
              <div>
                <h2 className="flex items-center gap-2 font-sans text-title font-semibold text-ink">
                  <Sparkles size={16} className="text-primary" aria-hidden="true" />
                  Tailor resume bullets
                </h2>
                <p className="mt-1.5 font-sans text-caption leading-relaxed text-ink-mute">
                  Paste an experience and the AI rewrites it as bullets tuned to
                  this job — streamed live.
                </p>
              </div>
              <TailorBullets
                id={application.id}
                initialExperience={application.tailoredExperience ?? ""}
                initialOutput={application.tailoredBullets ?? ""}
              />
            </section>
          )}

          {application.jobDescription?.trim() && (
            <section
              id="interview-prep"
              className="flex scroll-mt-8 flex-col gap-3 py-8 first:pt-0"
            >
              <div>
                <h2 className="flex items-center gap-2 font-sans text-title font-semibold text-ink">
                  <Sparkles size={16} className="text-primary" aria-hidden="true" />
                  Interview prep
                </h2>
                <p className="mt-1.5 font-sans text-caption leading-relaxed text-ink-mute">
                  Generate likely technical and behavioral questions for this
                  job, with pointers on what strong answers cover.
                </p>
              </div>
              <InterviewPrep
                id={application.id}
                initialOutput={application.interviewPrep ?? ""}
              />
            </section>
          )}

          {application.notes && (
            <section id="notes" className="scroll-mt-8 py-8 first:pt-0">
              <h2 className="font-sans text-title font-semibold text-ink">
                Notes
              </h2>
              <p className="mt-3 whitespace-pre-wrap font-sans text-body leading-relaxed text-ink">
                {application.notes}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
