"use client";

import { useState, useTransition } from "react";
import { deleteApplication } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

export function DeleteApplicationButton({ id }: { id: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      try {
        await deleteApplication(id);
      } catch {
        // Without this the rejection escapes the transition and takes the whole
        // route to the error boundary. A successful delete redirects instead of
        // resolving here, so reaching this line always means the call failed.
        setOpen(false);
        toast("Couldn't delete the application. Please try again.", "error");
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
        title="Delete this application?"
        description="The application and its AI analysis will be permanently removed. This can't be undone."
        confirmLabel="Delete"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
