"use client";

import { useActionState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { computeResumeFit, type FitState } from "@/actions/applications";
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
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 bg-canvas text-ink font-sans font-bold text-[14px] tracking-[0.144px] py-2.5 px-5 rounded-pill border border-hairline transition-colors hover:bg-canvas-lavender disabled:opacity-60"
      >
        <Sparkles size={16} aria-hidden="true" />
        {pending ? "Computing…" : label}
      </button>
      {state.error && (
        <p role="alert" className="text-[14px] font-sans text-semantic-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
