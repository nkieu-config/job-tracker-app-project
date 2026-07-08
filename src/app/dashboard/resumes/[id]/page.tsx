import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/get-session";
import { formatDisplayDate } from "@/lib/format";
import { getResumeVersion } from "@/lib/data/resumes";
import { DeleteResumeButton } from "@/components/resumes/delete-resume-button";

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
          className="text-[14px] font-sans font-bold text-ink-mute hover:text-ink transition-colors"
        >
          ← Resumes
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-display-md text-ink tracking-tight">
              {resume.label}
            </h1>
            <p className="mt-2 font-sans text-[16px] text-ink-mute">
              Added {formatDisplayDate(resume.createdAt)}
            </p>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            {resume.fileUrl && (
              <a
                href={`/api/resumes/${resume.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center bg-canvas-lavender text-ink font-sans font-bold text-[14px] tracking-[0.144px] py-2.5 px-5 rounded-pill transition-colors hover:bg-canvas-lavender-hover whitespace-nowrap"
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
        <h2 className="text-[18px] font-sans font-bold text-ink">
          Extracted text
        </h2>
        {resume.content ? (
          <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-hairline bg-canvas p-6 font-sans text-[16px] text-ink">
            {resume.content}
          </pre>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-hairline p-8 text-center font-sans text-[16px] text-ink-mute bg-canvas">
            No text could be extracted (the PDF may be a scanned image).
          </p>
        )}
      </section>
    </div>
  );
}
