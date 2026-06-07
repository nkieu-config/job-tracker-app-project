"use client";

import { useActionState } from "react";
import { computeResumeFit, type FitState } from "./actions";

export function ComputeFitButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const action = computeResumeFit.bind(null, id);
  const [state, formAction, pending] = useActionState<FitState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {pending ? "Embedding…" : label}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
