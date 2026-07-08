import { z } from "zod";

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

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

export const applicationInputSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(200),
  role: z.string().trim().min(1, "Role is required").max(200),
  status: z.enum(APPLICATION_STATUSES),
  jobUrl: z.preprocess(
    emptyToNull,
    z.url("Enter a valid URL").max(2000).nullable(),
  ),
  jobDescription: z.preprocess(
    emptyToNull,
    z.string().trim().max(20000).nullable(),
  ),
  deadline: z.preprocess(emptyToNull, z.coerce.date().nullable()),
  notes: z.preprocess(emptyToNull, z.string().trim().max(5000).nullable()),
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

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
