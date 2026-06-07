import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { getApplication } from "@/lib/data/applications";
import { StatusBadge } from "../status-badge";
import { DeleteApplicationButton } from "../delete-application-button";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const application = await getApplication(id, session!.user.id);

  if (!application) {
    notFound();
  }

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
              ? application.deadline.toISOString().slice(0, 10)
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
