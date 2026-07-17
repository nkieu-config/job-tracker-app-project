"use client";

import { Sparkles } from "lucide-react";
import { saveInterviewPrep } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { useAiStream } from "@/components/applications/use-ai-stream";

export function InterviewPrep({
  id,
  initialOutput = "",
}: {
  id: string;
  initialOutput?: string;
}) {
  const { output, loading, error, generate, copyOutput } = useAiStream({
    url: `/api/applications/${id}/interview`,
    initialOutput,
    requestFailed: "Failed to generate interview prep.",
    onSave: (text) => saveInterviewPrep(id, text),
    savedMessage: "Interview prep saved to this application.",
    saveFailedMessage: "Prep sheet generated but could not be saved.",
  });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button onClick={() => generate()} disabled={loading}>
          <Sparkles size={16} aria-hidden="true" />
          {loading
            ? "Preparing…"
            : output
              ? "Regenerate prep sheet"
              : "Generate prep sheet"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-body font-sans text-semantic-error">
          {error}
        </p>
      )}

      {(output || loading) && (
        <div className="flex flex-col gap-2">
          <div
            aria-live="polite"
            className="whitespace-pre-wrap rounded-xl border border-hairline bg-canvas p-6 font-sans text-body-lg leading-relaxed text-ink"
          >
            {output}
            {loading && <span className="animate-pulse">▍</span>}
          </div>
          {output && !loading && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={copyOutput}>
                Copy prep sheet
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
