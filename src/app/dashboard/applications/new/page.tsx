import Link from "next/link";
import { ApplicationForm } from "@/components/applications/application-form";
import { createApplication } from "@/actions/applications";

export default function NewApplicationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/applications"
          className="text-[14px] font-sans font-bold text-ink-mute hover:text-ink transition-colors"
        >
          ← Applications
        </Link>
        <h1 className="mt-2 font-display-md text-ink tracking-tight">
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
