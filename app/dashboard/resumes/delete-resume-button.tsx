"use client";

import { useTransition } from "react";
import { deleteResume } from "./actions";

export function DeleteResumeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this resume version? This can't be undone.")) return;
    startTransition(() => deleteResume(id));
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-md border border-red-300 px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
