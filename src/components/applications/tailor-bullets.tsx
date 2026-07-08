"use client";

import { useState } from "react";
import { inputClass } from "@/lib/form-styles";
import { saveTailoredBullets } from "@/actions/applications";
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

  async function generate() {
    if (!experience.trim()) {
      setError("Describe your experience first.");
      return;
    }
    setError(null);
    setOutput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/applications/${id}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experience }),
      });
      if (!res.ok || !res.body) {
        setError((await res.text()) || "Failed to generate bullets.");
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
        const saved = await saveTailoredBullets(id, experience, fullText);
        if (saved.error) {
          toast("Bullets generated but could not be saved.", "error");
        } else {
          toast("Bullets saved to this application.");
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
          className="inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] tracking-[0.2px] py-2.5 px-5 rounded-pill transition-colors hover:bg-primary-press disabled:opacity-60"
        >
          {loading ? "Tailoring…" : output ? "Regenerate bullets" : "Tailor bullets"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-[14px] font-sans text-semantic-error">
          {error}
        </p>
      )}

      {(output || loading) && (
        <div className="flex flex-col gap-2">
          <div
            aria-live="polite"
            className="whitespace-pre-wrap rounded-xl border border-hairline bg-canvas p-6 font-sans text-[16px] text-ink"
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
                Copy bullets
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
