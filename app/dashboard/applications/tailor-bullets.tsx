"use client";

import { useState } from "react";
import { inputClass } from "@/lib/form-styles";

export function TailorBullets({ id }: { id: string }) {
  const [experience, setExperience] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      // Read the streamed plain-text response chunk by chunk.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setError("Streaming failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <textarea
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          rows={4}
          placeholder="Paste a rough description of a project or role you want to tailor…"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] tracking-[0.2px] py-[10px] px-[20px] rounded-[90px] transition-colors hover:bg-primary-press disabled:opacity-60"
        >
          {loading ? "Tailoring…" : "Tailor bullets"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-[14px] font-sans text-semantic-error">
          {error}
        </p>
      )}

      {(output || loading) && (
        <pre className="whitespace-pre-wrap rounded-[12px] border border-hairline bg-canvas p-[24px] font-sans text-[16px] text-ink">
          {output}
          {loading && <span className="animate-pulse">▍</span>}
        </pre>
      )}
    </div>
  );
}
