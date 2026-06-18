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
  return <span className="text-[12px] font-sans text-semantic-error">{messages[0]}</span>;
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
        <div className="flex flex-col gap-1 mb-1">
          <span>Job description</span>
        </div>
        <textarea
          name="jobDescription"
          defaultValue={defaultValues.jobDescription}
          rows={6}
          className={inputClass}
        />
        <div className="text-[13px] font-sans text-ink bg-canvas-lavender px-3 py-2 rounded-md border border-hairline flex items-start gap-2 mt-1 shadow-sm">
          <span className="text-[14px]">✨</span>
          <span><b>Pro Tip:</b> Paste the full job description here to unlock AI Skills Analysis and Resume Fit Scoring!</span>
        </div>
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
          className="rounded-[8px] bg-semantic-error-tint px-3 py-2 text-[14px] font-sans text-semantic-error"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] tracking-[0.2px] py-[14px] px-[28px] rounded-[90px] transition-colors hover:bg-primary-press disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex items-center justify-center bg-canvas-lavender text-ink font-sans font-bold text-[16px] tracking-[0.2px] py-[14px] px-[28px] rounded-[90px] transition-colors hover:bg-canvas-lavender-hover"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
