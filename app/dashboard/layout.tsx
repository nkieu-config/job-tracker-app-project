import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/get-session";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guards rendering of every /dashboard page. Data queries are still
  // independently scoped by userId — this is defense in depth.
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-1 flex-col bg-canvas-lavender font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline bg-canvas px-4 py-4 md:px-12">
        <nav className="flex items-center gap-4 sm:gap-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-on-primary font-bold text-xl leading-none">J</span>
            </div>
            <span className="font-display-md text-primary text-2xl tracking-tight hidden sm:inline-block">Job Tracker</span>
          </Link>
          <div className="flex gap-4 sm:gap-6 text-[16px] font-medium text-ink-mute">
            <Link
              href="/dashboard/applications"
              className="transition-colors hover:text-primary"
            >
              Applications
            </Link>
            <Link
              href="/dashboard/resumes"
              className="transition-colors hover:text-primary"
            >
              Resumes
            </Link>
          </div>
        </nav>
        <div className="flex items-center gap-4 ml-auto">
          <span className="hidden text-[14px] text-ink-mute sm:inline">
            {session.user.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        {children}
      </main>
    </div>
  );
}
