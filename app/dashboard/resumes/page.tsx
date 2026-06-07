import Link from "next/link";
import { getSession } from "@/lib/get-session";
import { getResumeVersions } from "@/lib/data/resumes";
import { ResumeUploadForm } from "./resume-upload-form";

export default async function ResumesPage() {
  const session = await getSession();
  const resumes = await getResumeVersions(session!.user.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Resumes
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload PDF versions of your resume. We extract the text so the AI
          features (coming next) can use it.
        </p>
      </div>

      <ResumeUploadForm />

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Your versions
        </h2>
        {resumes.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No resume versions yet.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {resumes.map((resume) => (
              <li key={resume.id}>
                <Link
                  href={`/dashboard/resumes/${resume.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                >
                  <span className="truncate font-medium text-black dark:text-zinc-50">
                    {resume.label}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {resume.createdAt.toISOString().slice(0, 10)}
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
