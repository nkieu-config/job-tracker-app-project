"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
} from "@/lib/validations/application";
import { inputClass, labelClass } from "@/lib/form-styles";
import type { FormState } from "./actions";

export type ApplicationFormValues = {
  company?: string;
  role?: string;
  status?: string;
  jobUrl?: string;
  deadline?: string; // yyyy-mm-dd
  jobDescription?: string;
  notes?: string;
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <span className="text-xs text-red-600 dark:text-red-400">{messages[0]}</span>;
}

export function ApplicationForm({
  action,
  defaultValues = {},
  submitLabel,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: ApplicationFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const fe = state.fieldErrors;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          Company
          <input
            name="company"
            defaultValue={defaultValues.company}
            required
            className={inputClass}
          />
          <FieldError messages={fe?.company} />
        </label>

        <label className={labelClass}>
          Role
          <input
            name="role"
            defaultValue={defaultValues.role}
            required
            className={inputClass}
          />
          <FieldError messages={fe?.role} />
        </label>

        <label className={labelClass}>
          Status
          <select
            name="status"
            defaultValue={defaultValues.status ?? "SAVED"}
            className={inputClass}
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <FieldError messages={fe?.status} />
        </label>

        <label className={labelClass}>
          Deadline
          <input
            type="date"
            name="deadline"
            defaultValue={defaultValues.deadline}
            className={inputClass}
          />
          <FieldError messages={fe?.deadline} />
        </label>
      </div>

      <label className={labelClass}>
        Job URL
        <input
          type="url"
          name="jobUrl"
          defaultValue={defaultValues.jobUrl}
          placeholder="https://…"
          className={inputClass}
        />
        <FieldError messages={fe?.jobUrl} />
      </label>

      <label className={labelClass}>
        Job description
        <textarea
          name="jobDescription"
          defaultValue={defaultValues.jobDescription}
          rows={6}
          className={inputClass}
        />
        <FieldError messages={fe?.jobDescription} />
      </label>

      <label className={labelClass}>
        Notes
        <textarea
          name="notes"
          defaultValue={defaultValues.notes}
          rows={3}
          className={inputClass}
        />
        <FieldError messages={fe?.notes} />
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
