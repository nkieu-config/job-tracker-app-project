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
      className="inline-flex items-center justify-center bg-semantic-error-tint text-semantic-error font-sans font-bold text-[14px] tracking-[0.144px] py-[10px] px-[20px] rounded-[90px] transition-colors hover:bg-semantic-error-hover disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
