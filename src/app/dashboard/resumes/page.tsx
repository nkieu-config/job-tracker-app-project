import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/server/get-session";
import { FileText } from "lucide-react";
import { formatDisplayDate } from "@/lib/format";
import { getResumeSummaries } from "@/server/data/resumes";
import { ResumeUploadForm } from "@/components/resumes/resume-upload-form";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Resumes",
};

export default async function ResumesPage() {
  const session = await requireSession();
  const resumes = await getResumeSummaries(session.user.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display-md text-ink tracking-tight">
          Resumes
        </h1>
        <p className="mt-2 font-sans text-body-lg text-ink-mute">
          Upload PDF versions of your resume. Our AI uses these to compute your Fit Score and identify missing skills for any job application.
        </p>
      </div>

      <ResumeUploadForm />

      <section>
        <h2 className="text-title font-sans font-bold text-ink">
          Your versions
        </h2>
        {resumes.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={
              <FileText size={32} className="text-ink-mute" aria-hidden="true" />
            }
          >
            No resumes uploaded yet. Upload your first resume above to unlock AI
            Fit Scoring.
          </EmptyState>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {resumes.map((resume) => (
              <li key={resume.id}>
                <Link
                  href={`/dashboard/resumes/${resume.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-canvas px-6 py-4 transition-shadow hover:shadow-[0_5px_20px_rgba(0,0,0,0.05)]"
                >
                  <span className="truncate font-sans font-bold text-ink">
                    {resume.label}
                  </span>
                  <span className="shrink-0 font-mono text-caption tabular-nums text-ink-mute">
                    {formatDisplayDate(resume.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
