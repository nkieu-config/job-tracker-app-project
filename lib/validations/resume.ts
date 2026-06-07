// Resume upload constraints. Kept under Vercel's ~4.5MB serverless request
// body limit; resumes are small, so 4MB is plenty.
export const MAX_RESUME_BYTES = 4 * 1024 * 1024; // 4 MB
export const ACCEPTED_RESUME_TYPE = "application/pdf";
export const MAX_LABEL_LENGTH = 100;

// PDF files begin with the magic bytes "%PDF-".
export const PDF_MAGIC = "%PDF-";

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
