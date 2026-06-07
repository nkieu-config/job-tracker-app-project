"use client";

import { useState } from "react";

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
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-800"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-9 w-fit items-center justify-center rounded-md bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {loading ? "Tailoring…" : "Tailor bullets"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {(output || loading) && (
        <pre className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-4 font-sans text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          {output}
          {loading && <span className="animate-pulse">▍</span>}
        </pre>
      )}
    </div>
  );
}
