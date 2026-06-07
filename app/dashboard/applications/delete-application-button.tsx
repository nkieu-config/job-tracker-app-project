"use client";

import { useTransition } from "react";
import { deleteApplication } from "./actions";

export function DeleteApplicationButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this application? This can't be undone.")) return;
    startTransition(() => deleteApplication(id));
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
