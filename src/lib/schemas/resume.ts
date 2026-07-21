import { z } from "zod";

// Resume upload constraints. Kept under Vercel's ~4.5MB serverless request
// body limit; resumes are small, so 4MB is plenty.
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_RESUME_TYPE = "application/pdf";
export const MAX_LABEL_LENGTH = 100;
export const PDF_MAGIC = "%PDF-";

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// One definition of a valid upload, shared by the form and the route so the two
// can't drift — the form previously hard-coded the label cap and had already
// fallen out of step with MAX_LABEL_LENGTH.
export const resumeUploadSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Give this version a label.")
    .max(
      MAX_LABEL_LENGTH,
      `Label must be ${MAX_LABEL_LENGTH} characters or fewer.`,
    ),
  file: z
    .instanceof(File, { message: "Choose a PDF file." })
    .refine((f) => f.size > 0, "Choose a PDF file.")
    .refine(
      (f) => f.type === ACCEPTED_RESUME_TYPE,
      "Only PDF files are allowed.",
    )
    .refine(
      (f) => f.size <= MAX_RESUME_BYTES,
      `File too large (max ${humanFileSize(MAX_RESUME_BYTES)}).`,
    ),
});

export function firstUploadError(input: {
  label: unknown;
  file: unknown;
}): string | null {
  const result = resumeUploadSchema.safeParse(input);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}
