"use client";

import { useActionState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { computeResumeFit, type FitState } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ComputeFitButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const toast = useToast();
  const action = computeResumeFit.bind(null, id);
  const [state, formAction, pending] = useActionState<FitState, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.success) toast("Fit scores updated.");
  }, [state, toast]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" variant="ghost" disabled={pending}>
        <Sparkles size={16} aria-hidden="true" />
        {pending ? "Computing…" : label}
      </Button>
      {state.error && (
        <p role="alert" className="text-body font-sans text-semantic-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
