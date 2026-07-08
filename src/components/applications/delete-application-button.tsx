"use client";

import { useState, useTransition } from "react";
import { deleteApplication } from "@/actions/applications";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteApplicationButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={pending}
        className="inline-flex items-center justify-center bg-semantic-error-tint text-semantic-error font-sans font-bold text-[14px] tracking-[0.144px] py-2.5 px-5 rounded-pill transition-colors hover:bg-semantic-error-hover disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      <ConfirmDialog
        open={open}
        title="Delete this application?"
        description="The application and its AI analysis will be permanently removed. This can't be undone."
        confirmLabel="Delete"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => startTransition(() => deleteApplication(id))}
      />
    </>
  );
}
