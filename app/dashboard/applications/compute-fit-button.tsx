"use client";

import { useActionState } from "react";
import { computeResumeFit, type FitState } from "./actions";

export function ComputeFitButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const action = computeResumeFit.bind(null, id);
  const [state, formAction, pending] = useActionState<FitState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center bg-canvas text-ink font-sans font-bold text-[14px] tracking-[0.144px] py-[10px] px-[20px] rounded-[90px] border border-hairline transition-colors hover:bg-canvas-lavender disabled:opacity-60"
      >
        {pending ? "Embedding…" : label}
      </button>
      {state.error && (
        <p role="alert" className="text-[14px] font-sans text-semantic-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
