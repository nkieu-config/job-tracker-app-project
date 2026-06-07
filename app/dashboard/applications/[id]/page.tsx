import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/get-session";
import { formatDate } from "@/lib/format";
import { getApplication } from "@/lib/data/applications";
import { getResumeVersions } from "@/lib/data/resumes";
import { jdAnalysisSchema } from "@/lib/validations/jd-analysis";
import { matchSkills } from "@/lib/skills";
import { getResumeFitScores } from "@/lib/data/embeddings";
import { StatusBadge } from "../status-badge";
import { DeleteApplicationButton } from "../delete-application-button";
import { AnalyzeButton } from "../analyze-button";
import { ComputeFitButton } from "../compute-fit-button";
import { TailorBullets } from "../tailor-bullets";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const application = await getApplication(id, session.user.id);

  if (!application) {
    notFound();
  }

  // Parse the stored AI analysis (it was validated before saving, but the DB
  // column is untyped JSON, so validate again on the way out).
  const analysisResult = jdAnalysisSchema.safeParse(application.analysis);
  const analysis = analysisResult.success ? analysisResult.data : null;

  // Gap analysis compares required skills against all the user's resume text.
  const resumes = await getResumeVersions(session.user.id);
  const resumeText = resumes.map((r) => r.content ?? "").join("\n");
  const gap = analysis ? matchSkills(analysis.requiredSkills, resumeText) : null;

  // pgvector ranking of resume versions by similarity to the JD embedding.
  const fitScores = await getResumeFitScores(id, session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/applications"
          className="text-sm text-zinc-500 hover:text-black dark:hover:text-zinc-50"
        >
          ← Applications
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
              {application.role}
            </h1>
            <p className="mt-1 text-zinc-500">{application.company}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/applications/${application.id}/edit`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Edit
            </Link>
            <DeleteApplicationButton id={application.id} />
          </div>
        </div>
      </div>

      <dl className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Status
          </dt>
          <dd className="mt-1">
            <StatusBadge status={application.status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Deadline
          </dt>
          <dd className="mt-1 text-sm text-black dark:text-zinc-50">
            {application.deadline
              ? formatDate(application.deadline)
              : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Job URL
          </dt>
          <dd className="mt-1 text-sm">
            {application.jobUrl ? (
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-black underline-offset-4 hover:underline dark:text-zinc-50"
              >
                {application.jobUrl}
              </a>
            ) : (
              <span className="text-zinc-500">—</span>
            )}
          </dd>
        </div>
      </dl>

      {application.jobDescription && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Job description
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
            {application.jobDescription}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Skills analysis
          </h2>
          {application.jobDescription?.trim() && (
            <AnalyzeButton
              id={application.id}
              label={analysis ? "Re-analyze" : "Analyze job description"}
            />
          )}
        </div>

        {!application.jobDescription?.trim() ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Add a job description (via Edit) to analyze the required skills.
          </p>
        ) : !analysis ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Not analyzed yet — run “Analyze job description”.
          </p>
        ) : (
          <div className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                {analysis.summary}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Seniority:{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {analysis.seniority}
                </span>
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Required skills
                </h3>
                {gap && resumes.length > 0 && (
                  <span className="text-xs text-zinc-500">
                    {gap.matched.length}/{analysis.requiredSkills.length} in your
                    resume
                  </span>
                )}
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {analysis.requiredSkills.map((skill) => {
                  const matched = gap?.matched.includes(skill);
                  const cls =
                    resumes.length === 0
                      ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      : matched
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
                  return (
                    <li
                      key={skill}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
                    >
                      {skill}
                      {resumes.length > 0 && (matched ? " ✓" : " ✗")}
                    </li>
                  );
                })}
              </ul>
              {resumes.length === 0 && (
                <p className="mt-2 text-xs text-zinc-500">
                  Upload a resume to see which skills you’re missing.
                </p>
              )}
            </div>

            {analysis.niceToHave.length > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Nice to have
                </h3>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {analysis.niceToHave.map((skill) => (
                    <li
                      key={skill}
                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {gap && resumes.length > 0 && gap.missing.length > 0 && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-black dark:text-zinc-50">
                  Gap:
                </span>{" "}
                consider adding {gap.missing.join(", ")} to your resume.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Resume fit
          </h2>
          {application.jobDescription?.trim() && (
            <ComputeFitButton
              id={application.id}
              label={fitScores.length ? "Recompute fit" : "Compute resume fit"}
            />
          )}
        </div>

        {!application.jobDescription?.trim() ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Add a job description to score your resumes against it.
          </p>
        ) : fitScores.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            {resumes.some((r) => r.content?.trim())
              ? "No fit scores yet — run “Compute resume fit” to rank your resumes against this JD."
              : "Upload a resume with readable text, then compute fit."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {fitScores.map((fit, i) => (
              <li
                key={fit.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <Link
                  href={`/dashboard/resumes/${fit.id}`}
                  className="min-w-0 truncate font-medium text-black hover:underline dark:text-zinc-50"
                >
                  {fit.label}
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  {i === 0 && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                      Best match
                    </span>
                  )}
                  <span className="text-sm font-semibold text-black dark:text-zinc-50">
                    {Math.round(fit.score * 100)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {application.jobDescription?.trim() && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Tailor resume bullets
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Paste an experience and the AI rewrites it as bullets tuned to this
              job — streamed live.
            </p>
          </div>
          <TailorBullets id={application.id} />
        </section>
      )}

      {application.notes && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Notes
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
            {application.notes}
          </p>
        </section>
      )}
    </div>
  );
}
