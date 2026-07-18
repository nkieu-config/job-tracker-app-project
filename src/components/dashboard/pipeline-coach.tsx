"use client";

import { useActionState, useEffect, useRef } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import {
  generatePipelineCoach,
  type CoachState,
} from "@/actions/insights";
import type { CoachAdvice } from "@/lib/schemas/coach";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDisplayDate } from "@/lib/format";

export function PipelineCoach({
  advice,
  generatedAt,
  isStale,
  canGenerate,
}: {
  advice: CoachAdvice | null;
  generatedAt: string | null;
  isStale: boolean;
  canGenerate: boolean;
}) {
  const toast = useToast();
  const [state, formAction, pending] = useActionState<CoachState, FormData>(
    generatePipelineCoach,
    {},
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast("Coaching updated.");
    }
    wasPending.current = pending;
  }, [pending, state, toast]);

  const label = advice ? "Refresh coaching" : "Get AI coaching";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-sans text-body font-bold text-ink">
            AI coach
          </h3>
          <p className="mt-1 font-sans text-caption text-ink-mute">
            Strategic advice from your whole pipeline
          </p>
        </div>
        {canGenerate && (
          <form action={formAction}>
            <Button
              type="submit"
              variant={advice ? "ghost" : "primary"}
              size="sm"
              disabled={pending}
            >
              {advice ? (
                <RefreshCw
                  size={14}
                  aria-hidden="true"
                  className={pending ? "animate-spin" : undefined}
                />
              ) : (
                <Sparkles size={14} aria-hidden="true" />
              )}
              {pending ? "Coaching…" : label}
            </Button>
          </form>
        )}
      </div>

      {state.error && (
        <p role="alert" className="font-sans text-body text-semantic-error">
          {state.error}
        </p>
      )}

      {!advice ? (
        <p className="font-sans text-body text-ink-mute">
          {canGenerate
            ? "Generate a read on your job search — response and interview rates, the skills coming up most, and what to do next."
            : "Analyze at least two job descriptions and the coach can read your pipeline for patterns and next steps."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="font-sans text-body-lg font-medium text-ink">
            {advice.headline}
          </p>

          {advice.focusSkill.trim() && (
            <div className="flex items-center gap-2">
              <span className="font-sans text-caption text-ink-mute">
                Focus next on
              </span>
              <span className="rounded-full bg-semantic-warning-tint px-2.5 py-0.5 font-sans text-caption font-semibold text-semantic-warning">
                {advice.focusSkill}
              </span>
            </div>
          )}

          {advice.recommendations.length > 0 && (
            <ul className="flex flex-col gap-3">
              {advice.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-canvas-lavender font-mono text-fine font-bold text-primary"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-sans text-body font-bold text-ink">
                      {rec.title}
                    </p>
                    <p className="mt-0.5 font-sans text-body text-ink-mute">
                      {rec.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="font-sans text-fine text-ink-mute">
            {isStale
              ? "Your pipeline has changed since this was written — refresh for an up-to-date read."
              : generatedAt
                ? `Generated ${formatDisplayDate(new Date(generatedAt))}`
                : null}
          </p>
        </div>
      )}
    </div>
  );
}
