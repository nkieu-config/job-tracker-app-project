"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  firstUploadError,
  MAX_LABEL_LENGTH,
  MAX_RESUME_BYTES,
  humanFileSize,
} from "@/lib/schemas/resume";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { inputClass, labelClass } from "@/components/ui/form-styles";

export function ResumeUploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    const label = (formData.get("label") ?? "").toString().trim();

    // Fast client-side checks; the server re-validates authoritatively.
    const problem = firstUploadError({ label, file });
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        setLoading(false);
        return;
      }
      form.reset();
      router.push(`/dashboard/resumes/${data.id}`);
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={cardClass("flex flex-col gap-6 p-8")}>
      <label className={labelClass}>
        Label
        <input
          name="label"
          required
          maxLength={MAX_LABEL_LENGTH}
          placeholder="e.g. Backend-focused v2"
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        PDF file
        <input
          type="file"
          name="file"
          accept="application/pdf,.pdf"
          required
          className="text-body text-ink-mute file:mr-3 file:rounded-sm file:border-0 file:bg-hairline file:px-3 file:py-2 file:text-body file:font-medium file:text-ink hover:file:bg-canvas-lavender"
        />
        <span className="text-fine font-sans font-medium text-ink-mute">
          PDF only, up to {humanFileSize(MAX_RESUME_BYTES)}.
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-semantic-error-tint px-3 py-2 text-body font-sans text-semantic-error"
        >
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Uploading & parsing…" : "Upload resume"}
      </Button>
    </form>
  );
}
