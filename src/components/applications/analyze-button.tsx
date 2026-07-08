"use client";

import { useActionState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { analyzeApplication, type AnalyzeState } from "@/actions/applications";
import { useToast } from "@/components/ui/toast";

export function AnalyzeButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const toast = useToast();
  const action = analyzeApplication.bind(null, id);
  const [state, formAction, pending] = useActionState<AnalyzeState, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.success) toast("Job description analyzed.");
  }, [state, toast]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-sans font-bold text-[14px] tracking-[0.144px] py-2.5 px-5 rounded-pill transition-colors hover:bg-primary-press disabled:opacity-60"
      >
        <Sparkles size={16} aria-hidden="true" />
        {pending ? "Analyzing…" : label}
      </button>
      {state.error && (
        <p
          role="alert"
          className="text-[14px] font-sans text-semantic-error"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
