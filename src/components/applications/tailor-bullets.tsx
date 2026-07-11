"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui/form-styles";
import { saveTailoredBullets } from "@/actions/applications";
import { readAiStream } from "@/lib/stream-protocol";
import { useToast } from "@/components/ui/toast";

export function TailorBullets({
  id,
  initialExperience = "",
  initialOutput = "",
}: {
  id: string;
  initialExperience?: string;
  initialOutput?: string;
}) {
  const toast = useToast();
  const [experience, setExperience] = useState(initialExperience);
  const [output, setOutput] = useState(initialOutput);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight stream when the component unmounts (e.g. the user
  // navigates away) — otherwise the metered Gemini generation keeps running to
  // completion and setState fires on an unmounted component.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function generate() {
    if (!experience.trim()) {
      setError("Describe your experience first.");
      return;
    }
    // Bullets already saved to this application stay on screen until new ones
    // start streaming, and come back if the attempt fails — a rate-limited
    // regenerate shouldn't look like the saved copy was lost.
    const previous = output;
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/applications/${id}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experience }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setError((await res.text()) || "Failed to generate bullets.");
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
      const saved = await saveTailoredBullets(id, experience, text);
      if (saved.error) {
        toast("Bullets generated but could not be saved.", "error");
      } else {
        toast("Bullets saved to this application.");
      }
    } catch (err) {
      // An unmount/abort isn't a failure the (gone) user needs to see.
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          generate();
        }}
        className="flex flex-col gap-3"
      >
        <textarea
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          rows={4}
          placeholder="Paste a rough description of a project or role you want to tailor…"
          aria-label="Experience to tailor"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-body-lg tracking-[0.2px] py-2.5 px-5 rounded-pill transition-colors hover:bg-primary-press disabled:opacity-60"
        >
          {loading ? "Tailoring…" : output ? "Regenerate bullets" : "Tailor bullets"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-body font-sans text-semantic-error">
          {error}
        </p>
      )}

      {(output || loading) && (
        <div className="flex flex-col gap-2">
          <div
            aria-live="polite"
            className="whitespace-pre-wrap rounded-xl border border-hairline bg-canvas p-6 font-sans text-body-lg text-ink"
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
                Copy bullets
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
