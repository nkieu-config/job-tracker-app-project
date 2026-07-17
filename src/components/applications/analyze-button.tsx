"use client";

import { useActionState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { analyzeApplication, type AnalyzeState } from "@/actions/applications";
import { Button } from "@/components/ui/button";
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
      <Button type="submit" disabled={pending}>
        <Sparkles size={16} aria-hidden="true" />
        {pending ? "Analyzing…" : label}
      </Button>
      {state.error && (
        <p
          role="alert"
          className="text-body font-sans text-semantic-error"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
