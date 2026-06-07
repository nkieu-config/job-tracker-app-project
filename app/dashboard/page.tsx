import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await getSession();

  // Real security boundary — never trust proxy.ts alone (CVE-2025-29927).
  if (!session) {
    redirect("/sign-in");
  }

  const { user } = session;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <span className="text-sm font-semibold text-black dark:text-zinc-50">
          Job Tracker
        </span>
        <SignOutButton />
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Welcome, {user.name}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as {user.email}.
        </p>

        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Your job applications will show up here (phase 2).
        </div>
      </main>
    </div>
  );
}
