"use client";

import { useMemo, useState } from "react";
import { saveInterviewPrep } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { useAiStream } from "@/components/applications/use-ai-stream";
import { PrepSheetView } from "@/components/applications/prep-sheet-view";
import { PrepDrill } from "@/components/applications/prep-drill";
import { parsePrepSheet, drillableQuestions } from "@/lib/prep-sheet";

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
  const [drilling, setDrilling] = useState(false);

  // Parsing every frame of the stream is what makes questions arrive as whole
  // cards instead of as text crawling across the panel.
  const sheet = useMemo(() => parsePrepSheet(output), [output]);
  const drillable = useMemo(() => drillableQuestions(sheet), [sheet]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => generate()} disabled={loading}>
          {loading
            ? "Writing…"
            : output
              ? "Write a new sheet"
              : "Draft my prep sheet"}
        </Button>
        {!loading && !drilling && drillable.length > 0 && (
          <Button variant="outline" onClick={() => setDrilling(true)}>
            Practise {drillable.length} questions
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="font-sans text-body text-semantic-error">
          {error}
        </p>
      )}

      {drilling ? (
        <PrepDrill questions={drillable} onExit={() => setDrilling(false)} />
      ) : (
        (output || loading) && (
          <div className="flex flex-col gap-3">
            <div aria-live="polite" aria-busy={loading}>
              {sheet.sections.length > 0 || sheet.raw !== null ? (
                <PrepSheetView sheet={sheet} />
              ) : (
                <p className="rounded-xl border border-hairline bg-canvas p-6 font-sans text-body text-ink-mute">
                  Reading the posting…
                </p>
              )}
            </div>
            {output && !loading && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={copyOutput}>
                  Copy sheet
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
