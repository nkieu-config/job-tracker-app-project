import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/get-session";
import { formatDate } from "@/lib/format";
import { getApplication } from "@/lib/data/applications";
import { ApplicationForm } from "../../application-form";
import { updateApplication } from "../../actions";

export default async function EditApplicationPage({
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/applications/${application.id}`}
          className="text-sm text-zinc-500 hover:text-black dark:hover:text-zinc-50"
        >
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Edit application
        </h1>
      </div>
      <ApplicationForm
        action={updateApplication.bind(null, application.id)}
        submitLabel="Save changes"
        cancelHref={`/dashboard/applications/${application.id}`}
        defaultValues={{
          company: application.company,
          role: application.role,
          status: application.status,
          jobUrl: application.jobUrl ?? "",
          deadline: application.deadline
            ? formatDate(application.deadline)
            : "",
          jobDescription: application.jobDescription ?? "",
          notes: application.notes ?? "",
        }}
      />
    </div>
  );
}
