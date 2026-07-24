import Link from "next/link";
import type { StoredJdAnalysis } from "@/lib/schemas/jd-analysis";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AnalyzeButton } from "@/components/applications/analyze-button";
import { ComputeFitButton } from "@/components/applications/compute-fit-button";

export type FitRow = { id: string; label: string; score: number };

// A skill the posting asks for and your resume already backs up is highlighted;
// one it does not is underlined in red pen. Those two marks mean "the model
// marked this" and are used nowhere else in the app.
function SkillMark({ skill, matched }: { skill: string; matched: boolean }) {
  return (
    <li
      // A skill name is a proper noun for a technology. Browser auto-translate
      // will happily turn "Kubernetes" into something else and make the mark
      // point at a requirement the posting never wrote.
      translate="no"
      className={
        matched
          ? "rounded-sm bg-marker px-1.5 py-0.5 font-sans text-caption font-medium text-marker-ink"
          : "border-b-2 border-pen px-1.5 py-0.5 font-sans text-caption font-medium text-ink"
      }
    >
      {skill}
      <span className="sr-only">
        {matched ? " — in your resume" : " — missing from your resume"}
      </span>
    </li>
  );
}

export function MatchPanel({
  applicationId,
  hasJd,
  analysis,
  gap,
  resumeCount,
  fitScores,
  anyResumeHasText,
  staleNotice,
}: {
  applicationId: string;
  hasJd: boolean;
  analysis: StoredJdAnalysis | null;
  gap: { matched: string[]; missing: string[] } | null;
  resumeCount: number;
  fitScores: FitRow[];
  anyResumeHasText: boolean;
  staleNotice: string | null;
}) {
  if (!hasJd) {
    return (
      <EmptyState className="p-8">
        Add the job description and the AI can read it against your resumes.
      </EmptyState>
    );
  }

  // Cosine scores cluster in a narrow band, so a 0–100 bar makes three very
  // different resumes look identical. Scaling to this set's own range shows the
  // gap between them, which is the only comparison the score supports.
  const best = fitScores.length ? Math.max(...fitScores.map((f) => f.score)) : 0;
  const worst = fitScores.length
    ? Math.min(...fitScores.map((f) => f.score))
    : 0;
  const spread = best - worst;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-title font-semibold text-ink">
            Skills analysis
          </h2>
          <AnalyzeButton
            id={applicationId}
            label={analysis ? "Read it again" : "Read this posting"}
          />
        </div>

        {!analysis ? (
          <EmptyState className="p-8">
            Not read yet — takes about 4 seconds.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <p className="font-serif text-body-lg leading-relaxed text-ink">
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
                {gap && resumeCount > 0 && (
                  <span className="font-mono text-caption tabular-nums text-ink-mute">
                    {gap.matched.length}/{analysis.requiredSkills.length} matched
                  </span>
                )}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-2.5">
                {analysis.requiredSkills.map((skill) => (
                  <SkillMark
                    key={skill}
                    skill={skill}
                    matched={Boolean(gap?.matched.includes(skill))}
                  />
                ))}
              </ul>
              {resumeCount === 0 && (
                <p className="mt-3 font-sans text-caption text-ink-mute">
                  Upload a resume to see which of these you already cover.
                </p>
              )}
            </div>

            {analysis.niceToHave.length > 0 && (
              <div>
                <h3 className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
                  Nice to have
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2 font-sans text-caption text-ink-mute">
                  {analysis.niceToHave.map((skill) => (
                    <li
                      key={skill}
                      className="rounded-sm border border-hairline px-1.5 py-0.5"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {staleNotice && (
              <p className="rounded-lg bg-semantic-warning-tint px-3 py-2 font-sans text-caption font-medium text-ink">
                {staleNotice}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-hairline pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-title font-semibold text-ink">
            Resume fit
          </h2>
          <ComputeFitButton
            id={applicationId}
            label={fitScores.length ? "Score again" : "Score my resumes"}
          />
        </div>

        {fitScores.length === 0 ? (
          <EmptyState className="p-8">
            {anyResumeHasText
              ? "No scores yet — takes about 6 seconds."
              : "Upload a resume with readable text, then score it."}
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              {fitScores.map((fit, i) => (
                <li key={fit.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/dashboard/resumes/${fit.id}`}
                      className="truncate font-sans text-body font-medium text-link-blue underline-offset-4 hover:text-link-hover hover:underline"
                    >
                      {fit.label}
                    </Link>
                    <span className="shrink-0 font-mono text-body tabular-nums text-ink">
                      {Math.round(fit.score * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width:
                          spread > 0
                            ? `${8 + ((fit.score - worst) / spread) * 92}%`
                            : "100%",
                        opacity: i === 0 ? 1 : 0.55,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="font-sans text-caption leading-relaxed text-ink-mute">
              Bars are scaled to this set, not to 100% — the score is cosine
              similarity between this posting and each resume, computed in
              Postgres with pgvector. It ranks your resumes against each other,
              and says nothing about your odds.
            </p>
          </div>
        )}

        {resumeCount === 0 && (
          <Link
            href="/dashboard/resumes"
            className={buttonClass({ variant: "outline", size: "sm" })}
          >
            Upload a resume
          </Link>
        )}
      </section>
    </div>
  );
}
