import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/get-session";
import { formatDate } from "@/lib/format";
import { getResumeVersion } from "@/lib/data/resumes";
import { DeleteResumeButton } from "../delete-resume-button";

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
          className="text-sm text-zinc-500 hover:text-black dark:hover:text-zinc-50"
        >
          ← Resumes
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
              {resume.label}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Added {formatDate(resume.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {resume.fileUrl && (
              <a
                href={`/api/resumes/${resume.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                View PDF
              </a>
            )}
            <DeleteResumeButton id={resume.id} />
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Extracted text
        </h2>
        {resume.content ? (
          <pre className="mt-2 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-4 font-sans text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            {resume.content}
          </pre>
        ) : (
          <p className="mt-2 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No text could be extracted (the PDF may be a scanned image).
          </p>
        )}
      </section>
    </div>
  );
}
