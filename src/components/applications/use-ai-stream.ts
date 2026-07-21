"use client";

import { useEffect, useRef, useState } from "react";
import { readErrorMessage } from "@/lib/http";
import { readAiStream } from "@/lib/stream-protocol";
import { useToast } from "@/components/ui/toast";

type UseAiStreamOptions = {
  url: string;
  initialOutput?: string;
  // Shown when the response carries no message of its own.
  requestFailed: string;
  onSave: (text: string) => Promise<{ error?: string }>;
  savedMessage: string;
  saveFailedMessage: string;
};

// The lifecycle both streaming AI features share: POST, render tokens as they
// arrive, refuse to persist anything the stream didn't vouch for, save, toast.
// The two features differ only in their endpoint, request body, and wording —
// everything below is the part that must not diverge between them.
export function useAiStream({
  url,
  initialOutput = "",
  requestFailed,
  onSave,
  savedMessage,
  saveFailedMessage,
}: UseAiStreamOptions) {
  const toast = useToast();
  const [output, setOutput] = useState(initialOutput);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight stream when the component unmounts (e.g. the user
  // navigates away) — otherwise the metered Gemini generation keeps running to
  // completion and setState fires on an unmounted component.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function generate(body?: unknown) {
    // Output already saved to this application stays on screen until new output
    // starts streaming, and comes back if the attempt fails — a rate-limited
    // regenerate shouldn't look like the saved copy was lost.
    const previous = output;
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(url, {
        method: "POST",
        ...(body === undefined
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setError(await readErrorMessage(res, requestFailed));
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
      const saved = await onSave(text);
      if (saved.error) {
        toast(saveFailedMessage, "error");
      } else {
        toast(savedMessage);
      }
    } catch (err) {
      // An unmount/abort isn't a failure the (gone) user needs to see.
      if (!(err instanceof Error && err.name === "AbortError")) {
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

  return { output, loading, error, setError, generate, copyOutput };
}
