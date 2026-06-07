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
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/dashboard"
            className="font-semibold text-black dark:text-zinc-50"
          >
            Job Tracker
          </Link>
          <Link
            href="/dashboard/applications"
            className="text-zinc-600 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Applications
          </Link>
          <Link
            href="/dashboard/resumes"
            className="text-zinc-600 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Resumes
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-zinc-500 sm:inline">
            {session.user.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
