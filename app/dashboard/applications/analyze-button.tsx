"use client";

import { useActionState } from "react";
import { analyzeApplication, type AnalyzeState } from "./actions";

export function AnalyzeButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const action = analyzeApplication.bind(null, id);
  const [state, formAction, pending] = useActionState<AnalyzeState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[14px] tracking-[0.144px] py-[10px] px-[20px] rounded-[90px] transition-colors hover:bg-primary-press disabled:opacity-60"
      >
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
