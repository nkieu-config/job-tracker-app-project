"use client";

import { useState, useTransition } from "react";
import { deleteResume } from "@/actions/resumes";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

export function DeleteResumeButton({ id }: { id: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      try {
        await deleteResume(id);
      } catch {
        setOpen(false);
        toast("Couldn't delete the resume. Please try again.", "error");
      }
    });
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)} disabled={pending}>
        {pending ? "Deleting…" : "Delete"}
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete this resume version?"
        description="The PDF and its extracted text will be permanently removed. This can't be undone."
        confirmLabel="Delete"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
