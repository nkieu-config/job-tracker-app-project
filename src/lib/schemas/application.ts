import { z } from "zod";

import type { StoredJdAnalysis } from "@/lib/schemas/jd-analysis";

export const APPLICATION_STATUSES = [
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export const APPLICATION_SORTS = ["newest", "deadline", "company"] as const;

export type ApplicationSort = (typeof APPLICATION_SORTS)[number];

export const SORT_LABELS: Record<ApplicationSort, string> = {
  newest: "Newest first",
  deadline: "Deadline (soonest)",
  company: "Company (A–Z)",
};

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

export const applicationInputSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(200),
  role: z.string().trim().min(1, "Role is required").max(200),
  status: z.enum(APPLICATION_STATUSES),
  jobUrl: z.preprocess(
    emptyToNull,
    z
      .url({ protocol: /^https?$/, error: "Enter a valid http(s) URL" })
      .max(2000)
      .nullable(),
  ),
  jobDescription: z.preprocess(
    emptyToNull,
    z.string().trim().max(20000).nullable(),
  ),
  deadline: z.preprocess(emptyToNull, z.coerce.date().nullable()),
  notes: z.preprocess(emptyToNull, z.string().trim().max(5000).nullable()),
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

// Every shape a Server Action is allowed to write. The data layer used to take
// Prisma's UpdateManyMutationInput, which let any caller set any column.
export type ApplicationMutation =
  | ApplicationInput
  | { status: ApplicationStatus }
  | { tailoredExperience: string; tailoredBullets: string; tailoredAt: Date }
  | { interviewPrep: string; interviewPrepAt: Date }
  | { analysis: StoredJdAnalysis; analysisHash: string; analyzedAt: Date };

export function applicationInputFromFormData(formData: FormData) {
  return {
    company: formData.get("company"),
    role: formData.get("role"),
    status: formData.get("status"),
    jobUrl: formData.get("jobUrl"),
    jobDescription: formData.get("jobDescription"),
    deadline: formData.get("deadline"),
    notes: formData.get("notes"),
  };
}
