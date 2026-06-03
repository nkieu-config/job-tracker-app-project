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
      </main>
    </div>
  );
}
