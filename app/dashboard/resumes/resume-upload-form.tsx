"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCEPTED_RESUME_TYPE,
  MAX_RESUME_BYTES,
  humanFileSize,
} from "@/lib/validations/resume";
import { inputClass, labelClass } from "@/lib/form-styles";

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
    if (!label) {
      setError("Give this version a label.");
      return;
    }
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a PDF file.");
      return;
    }
    if (file.type !== ACCEPTED_RESUME_TYPE) {
      setError("Only PDF files are allowed.");
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setError(`File too large (max ${humanFileSize(MAX_RESUME_BYTES)}).`);
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
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6 rounded-[16px] border border-hairline bg-canvas p-[32px]"
    >
      <label className={labelClass}>
        Label
        <input
          name="label"
          required
          maxLength={100}
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
          className="text-[14px] text-ink-mute file:mr-3 file:rounded-[4px] file:border-0 file:bg-hairline file:px-3 file:py-2 file:text-[14px] file:font-medium file:text-ink hover:file:bg-canvas-lavender"
        />
        <span className="text-[12px] font-sans font-medium text-ink-mute">
          PDF only, up to {humanFileSize(MAX_RESUME_BYTES)}.
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-[8px] bg-semantic-error-tint px-3 py-2 text-[14px] font-sans text-semantic-error"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] tracking-[0.2px] py-[14px] px-[28px] rounded-[90px] transition-colors hover:bg-primary-press disabled:opacity-60"
      >
        {loading ? "Uploading & parsing…" : "Upload resume"}
      </button>
    </form>
  );
}
