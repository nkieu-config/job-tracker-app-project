"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
} from "@/lib/schemas/application";
import { Button, buttonClass } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/form-styles";
import { autofillFromJd, type FormState } from "@/actions/applications";

export type ApplicationFormValues = {
  company?: string;
  role?: string;
  status?: string;
  jobUrl?: string;
  deadline?: string; // yyyy-mm-dd
  jobDescription?: string;
  notes?: string;
};

type ReadField = "company" | "role" | "deadline";

function FieldError({ name, messages }: { name: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <span
      id={`${name}-error`}
      role="alert"
      className="text-fine font-sans text-semantic-error"
    >
      {messages[0]}
    </span>
  );
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
  const values = { ...defaultValues, ...state.values };

  const companyRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const deadlineRef = useRef<HTMLInputElement>(null);
  const jobDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const [jdLength, setJdLength] = useState(
    (values.jobDescription ?? "").trim().length,
  );
  const [autofilling, startAutofill] = useTransition();
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [read, setRead] = useState<ReadField[]>([]);
  const [missed, setMissed] = useState<ReadField[]>([]);

  // Fill only fields the user hasn't touched, so re-running never clobbers an
  // edit. The form is uncontrolled, so we read and write the DOM values through
  // refs; on submit the FormData picks them up like anything typed by hand.
  function onAutofill() {
    setAutofillError(null);
    startAutofill(async () => {
      const result = await autofillFromJd(
        jobDescriptionRef.current?.value ?? "",
      );
      if (result.error) {
        setAutofillError(result.error);
        return;
      }
      if (!result.fields) return;

      const filled: ReadField[] = [];
      const absent: ReadField[] = [];
      const fillIfEmpty = (
        ref: React.RefObject<HTMLInputElement | null>,
        value: string | null,
        field: ReadField,
      ) => {
        const el = ref.current;
        if (!value) {
          if (el && el.value.trim() === "") absent.push(field);
          return;
        }
        if (el && el.value.trim() === "") {
          el.value = value;
          filled.push(field);
        }
      };
      fillIfEmpty(companyRef, result.fields.company, "company");
      fillIfEmpty(roleRef, result.fields.role, "role");
      fillIfEmpty(deadlineRef, result.fields.deadline, "deadline");

      setRead(filled);
      setMissed(absent);
    });
  }

  // A value the model supplied has to stay distinguishable from one you typed,
  // right up until you touch it.
  const markRead = (field: ReadField) =>
    read.includes(field)
      ? `${inputClass} border-marker bg-marker/25`
      : inputClass;

  const clearMark = (field: ReadField) => () =>
    setRead((current) => current.filter((f) => f !== field));

  const readLabel = (field: ReadField) =>
    read.includes(field) ? (
      <span className="font-mono text-fine font-normal uppercase tracking-wide text-ink-mute">
        read from the posting
      </span>
    ) : missed.includes(field) ? (
      <span className="font-sans text-fine font-normal text-ink-mute">
        not stated — add it yourself
      </span>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className={labelClass}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="jobDescription">Job posting</label>
          <span className="font-sans text-fine font-normal text-ink-mute">
            Paste it and the rest fills itself in
          </span>
        </div>
        <textarea
          ref={jobDescriptionRef}
          id="jobDescription"
          name="jobDescription"
          defaultValue={values.jobDescription}
          onInput={(e) => setJdLength(e.currentTarget.value.trim().length)}
          rows={10}
          placeholder="Paste the whole posting — the more of it, the better every AI feature on this application works."
          aria-invalid={fe?.jobDescription ? true : undefined}
          aria-describedby={
            fe?.jobDescription ? "jobDescription-error" : undefined
          }
          className={`${inputClass} font-serif leading-relaxed`}
        />
        <FieldError name="jobDescription" messages={fe?.jobDescription} />

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onAutofill}
            disabled={autofilling || jdLength < 40}
            aria-describedby={autofillError ? "autofill-error" : undefined}
          >
            {autofilling ? "Reading…" : "Read the posting"}
          </Button>
          {jdLength > 0 && jdLength < 40 && (
            <span className="font-sans text-fine text-ink-mute">
              A little more text and it can read this.
            </span>
          )}
          {read.length > 0 && (
            <button
              type="button"
              onClick={() => {
                for (const [field, ref] of [
                  ["company", companyRef],
                  ["role", roleRef],
                  ["deadline", deadlineRef],
                ] as const) {
                  if (read.includes(field) && ref.current) ref.current.value = "";
                }
                setRead([]);
              }}
              className="font-sans text-fine font-semibold text-link-blue underline-offset-4 hover:underline"
            >
              Clear what it filled
            </button>
          )}
        </div>

        {autofillError && (
          <span
            id="autofill-error"
            role="alert"
            className="text-fine font-sans text-semantic-error"
          >
            {autofillError}
          </span>
        )}
      </div>

      <div className="grid gap-5 border-t border-hairline pt-6 sm:grid-cols-2">
        <label className={labelClass}>
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            Company
            {readLabel("company")}
          </span>
          <input
            ref={companyRef}
            name="company"
            defaultValue={values.company}
            required
            onInput={clearMark("company")}
            aria-invalid={fe?.company ? true : undefined}
            aria-describedby={fe?.company ? "company-error" : undefined}
            className={markRead("company")}
          />
          <FieldError name="company" messages={fe?.company} />
        </label>

        <label className={labelClass}>
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            Role
            {readLabel("role")}
          </span>
          <input
            ref={roleRef}
            name="role"
            defaultValue={values.role}
            required
            onInput={clearMark("role")}
            aria-invalid={fe?.role ? true : undefined}
            aria-describedby={fe?.role ? "role-error" : undefined}
            className={markRead("role")}
          />
          <FieldError name="role" messages={fe?.role} />
        </label>

        <label className={labelClass}>
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            Deadline
            {readLabel("deadline")}
          </span>
          <input
            ref={deadlineRef}
            type="date"
            name="deadline"
            defaultValue={values.deadline}
            onInput={clearMark("deadline")}
            aria-invalid={fe?.deadline ? true : undefined}
            aria-describedby={fe?.deadline ? "deadline-error" : undefined}
            className={markRead("deadline")}
          />
          <FieldError name="deadline" messages={fe?.deadline} />
        </label>

        <label className={labelClass}>
          Status
          <select
            name="status"
            defaultValue={values.status ?? "SAVED"}
            aria-invalid={fe?.status ? true : undefined}
            aria-describedby={fe?.status ? "status-error" : undefined}
            className={inputClass}
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <FieldError name="status" messages={fe?.status} />
        </label>
      </div>

      <label className={labelClass}>
        Job URL
        <input
          type="url"
          name="jobUrl"
          defaultValue={values.jobUrl}
          placeholder="https://…"
          aria-invalid={fe?.jobUrl ? true : undefined}
          aria-describedby={fe?.jobUrl ? "jobUrl-error" : undefined}
          className={inputClass}
        />
        <FieldError name="jobUrl" messages={fe?.jobUrl} />
      </label>

      <label className={labelClass}>
        Notes
        <textarea
          name="notes"
          defaultValue={values.notes}
          rows={3}
          aria-invalid={fe?.notes ? true : undefined}
          aria-describedby={fe?.notes ? "notes-error" : undefined}
          className={inputClass}
        />
        <FieldError name="notes" messages={fe?.notes} />
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-semantic-error-tint px-3 py-2 text-body font-sans text-semantic-error"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Link
          href={cancelHref}
          className={buttonClass({ variant: "secondary", size: "lg" })}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
