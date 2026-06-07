import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-6 text-center sm:text-left">
        <span className="inline-flex w-fit items-center gap-2 self-center rounded-full border border-black/8 px-3 py-1 text-xs font-medium text-zinc-600 sm:self-start dark:border-white/15 dark:text-zinc-400">
          Phase 0 · deployed &amp; running
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Job Tracker
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Smart job application tracker with AI-powered JD analysis and resume
          tailoring. Auth, CRUD, and AI features are on the way.
        </p>
        <div className="flex flex-col gap-3 self-center sm:flex-row sm:self-start">
          <Link
            href="/sign-up"
            className="inline-flex h-10 items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
