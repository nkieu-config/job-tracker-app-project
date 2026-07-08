"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { saveInterviewPrep } from "@/actions/applications";
import { useToast } from "@/components/ui/toast";

export function InterviewPrep({
  id,
  initialOutput = "",
}: {
  id: string;
  initialOutput?: string;
}) {
  const toast = useToast();
  const [output, setOutput] = useState(initialOutput);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setOutput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/applications/${id}/interview`, {
        method: "POST",
      });
      if (!res.ok || !res.body) {
        setError((await res.text()) || "Failed to generate interview prep.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setOutput(fullText);
      }
      if (fullText.trim()) {
        const saved = await saveInterviewPrep(id, fullText);
        if (saved.error) {
          toast("Prep sheet generated but could not be saved.", "error");
        } else {
          toast("Interview prep saved to this application.");
        }
      }
    } catch {
      setError("Streaming failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      toast("Copied to clipboard.");
    } catch {
      toast("Could not copy to clipboard.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-sans font-bold text-[14px] tracking-[0.144px] py-2.5 px-5 rounded-pill transition-colors hover:bg-primary-press disabled:opacity-60"
        >
          <Sparkles size={16} aria-hidden="true" />
          {loading
            ? "Preparing…"
            : output
              ? "Regenerate prep sheet"
              : "Generate prep sheet"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[14px] font-sans text-semantic-error">
          {error}
        </p>
      )}

      {(output || loading) && (
        <div className="flex flex-col gap-2">
          <div
            aria-live="polite"
            className="whitespace-pre-wrap rounded-xl border border-hairline bg-canvas p-6 font-sans text-[15px] leading-relaxed text-ink"
          >
            {output}
            {loading && <span className="animate-pulse">▍</span>}
          </div>
          {output && !loading && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyOutput}
                className="inline-flex items-center justify-center bg-canvas text-ink font-sans font-bold text-[14px] py-2 px-4 rounded-pill border border-hairline transition-colors hover:bg-canvas-lavender"
              >
                Copy prep sheet
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
