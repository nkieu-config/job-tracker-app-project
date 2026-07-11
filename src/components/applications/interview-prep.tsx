"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { saveInterviewPrep } from "@/actions/applications";
import { readAiStream } from "@/lib/stream-protocol";
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
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight stream when the component unmounts — otherwise the
  // metered Gemini generation runs to completion and setState fires on an
  // unmounted component.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function generate() {
    // A saved prep sheet stays on screen until a new one starts streaming, and
    // comes back if the attempt fails — a rate-limited regenerate shouldn't
    // look like the saved copy was lost.
    const previous = output;
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/applications/${id}/interview`, {
        method: "POST",
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setError((await res.text()) || "Failed to generate interview prep.");
        return;
      }
      setOutput("");
      const { text, end } = await readAiStream(res.body, setOutput);
      if (!end.ok) {
        setOutput(previous);
        setError(end.error);
        return;
      }
      if (!text.trim()) {
        setOutput(previous);
        setError("The AI returned an empty response. Please try again.");
        return;
      }
      const saved = await saveInterviewPrep(id, text);
      if (saved.error) {
        toast("Prep sheet generated but could not be saved.", "error");
      } else {
        toast("Interview prep saved to this application.");
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setOutput(previous);
        setError("Streaming failed. Please try again.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
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
          className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-sans font-bold text-body tracking-[0.144px] py-2.5 px-5 rounded-pill transition-colors hover:bg-primary-press disabled:opacity-60"
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
              <button
                type="button"
                onClick={copyOutput}
                className="inline-flex items-center justify-center bg-canvas text-ink font-sans font-bold text-body py-2 px-4 rounded-pill border border-hairline transition-colors hover:bg-canvas-lavender"
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
