"use client";

import { useActionState } from "react";
import { analyzeApplication, type AnalyzeState } from "./actions";

export function AnalyzeButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const action = analyzeApplication.bind(null, id);
  const [state, formAction, pending] = useActionState<AnalyzeState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 w-fit items-center justify-center rounded-md bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Analyzing…" : label}
      </button>
      {state.error && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
