import Link from "next/link";
import { ApplicationForm } from "../application-form";
import { createApplication } from "../actions";

export default function NewApplicationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/applications"
          className="text-sm text-zinc-500 hover:text-black dark:hover:text-zinc-50"
        >
          ← Applications
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          New application
        </h1>
      </div>
      <ApplicationForm
        action={createApplication}
        submitLabel="Create"
        cancelHref="/dashboard/applications"
      />
    </div>
  );
}
