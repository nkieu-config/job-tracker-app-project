import "server-only";

import {
  jdExtractionSchema,
  type JdExtraction,
} from "@/lib/schemas/jd-extract";
import { generateStructured } from "./structured";
import { fenceUntrusted, UNTRUSTED_DATA_RULE } from "./prompt";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A yyyy-mm-dd that the calendar actually has — the regex alone would accept
// 2026-13-40. An unparseable or impossible date becomes null rather than a
// value the date input would silently reject.
function normalizeDeadline(value: string | null): string | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

export async function extractApplicationFields(
  jobDescription: string,
  userId?: string,
): Promise<JdExtraction> {
  const prompt = `You are a data-entry assistant. From the job description below, extract fields to pre-fill an application form.

Guidelines:
- company: the hiring company's name. Empty string if not stated.
- role: the job title (e.g. "Senior Backend Engineer"). Empty string if not stated.
- deadline: the application deadline as an ISO date (YYYY-MM-DD), or null if the description doesn't state one. Do not guess a deadline from a posting date.
Use only information present in the job description. Do not invent a company, role, or date.
${UNTRUSTED_DATA_RULE}

Job description:
${fenceUntrusted(jobDescription)}`;

  const extraction = await generateStructured({
    schema: jdExtractionSchema,
    prompt,
    feature: "autofill",
    temperature: 0.1,
    logTag: "[ai:extract]",
    userId,
  });

  return {
    ...extraction,
    deadline: normalizeDeadline(extraction.deadline),
  };
}
