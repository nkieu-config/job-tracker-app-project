import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/get-session";
import { formatDisplayDate } from "@/lib/format";
import { getResumeVersion } from "@/server/data/resumes";
import { DeleteResumeButton } from "@/components/resumes/delete-resume-button";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await requireSession();
  const resume = await getResumeVersion(id, session.user.id);

  return { title: resume ? resume.label : "Resume not found" };
}

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const resume = await getResumeVersion(id, session.user.id);

  if (!resume) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/resumes"
          className="text-body font-sans font-bold text-ink-mute hover:text-ink transition-colors"
        >
          ← Resumes
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-display-md text-ink tracking-tight">
              {resume.label}
            </h1>
            <p className="mt-2 font-sans text-body-lg text-ink-mute">
              Added{" "}
              <span className="font-mono tabular-nums">
                {formatDisplayDate(resume.createdAt)}
              </span>
            </p>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            {resume.fileUrl && (
              <a
                href={`/api/resumes/${resume.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({
                  variant: "secondary",
                  className: "flex-1 sm:flex-none",
                })}
              >
                View PDF
              </a>
            )}
            <div className="flex-1 sm:flex-none *:w-full">
              <DeleteResumeButton id={resume.id} />
            </div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-title font-sans font-bold text-ink">
          Extracted text
        </h2>
        {resume.content ? (
          <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-hairline bg-canvas p-6 font-sans text-body-lg text-ink">
            {resume.content}
          </pre>
        ) : (
          <EmptyState className="mt-4 p-8">
            No text could be extracted (the PDF may be a scanned image).
          </EmptyState>
        )}
      </section>
    </div>
  );
}
