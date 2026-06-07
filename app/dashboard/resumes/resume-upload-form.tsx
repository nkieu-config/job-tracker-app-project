"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCEPTED_RESUME_TYPE,
  MAX_RESUME_BYTES,
  humanFileSize,
} from "@/lib/validations/resume";

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
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Label
        <input
          name="label"
          required
          maxLength={100}
          placeholder="e.g. Backend-focused v2"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-black outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        PDF file
        <input
          type="file"
          name="file"
          accept="application/pdf,.pdf"
          required
          className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200"
        />
        <span className="text-xs font-normal text-zinc-500">
          PDF only, up to {humanFileSize(MAX_RESUME_BYTES)}.
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {loading ? "Uploading & parsing…" : "Upload resume"}
      </button>
    </form>
  );
}
