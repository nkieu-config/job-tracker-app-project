import { NextResponse } from "next/server";
import { putResume, deleteBlobQuietly } from "@/server/blob";
import { getSession } from "@/server/get-session";
import { extractPdfText, PdfTooLongError } from "@/server/pdf";
import { checkUploadRateLimit } from "@/server/rate-limit";
import {
  countResumeVersions,
  createResumeVersion,
  MAX_RESUME_VERSIONS,
} from "@/server/data/resumes";
import { resumeBlobPath } from "@/lib/blob-paths";
import { jsonError } from "@/lib/http";
import {
  ACCEPTED_RESUME_TYPE,
  MAX_LABEL_LENGTH,
  MAX_RESUME_BYTES,
  PDF_MAGIC,
  humanFileSize,
} from "@/lib/schemas/resume";

export const maxDuration = 30;

export async function POST(request: Request) {
  // Auth boundary — route handlers are independent entry points.
  const session = await getSession();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  // Bound the cost of uploading before reading the body: each version is billed
  // blob storage, a PDF parse, and an embedding on the next fit computation.
  if (!(await checkUploadRateLimit(session.user.id))) {
    return jsonError("Upload rate limit reached. Please try again later.", 429);
  }
  if ((await countResumeVersions(session.user.id)) >= MAX_RESUME_VERSIONS) {
    return jsonError(
      `You've reached the limit of ${MAX_RESUME_VERSIONS} resume versions. Delete one to upload another.`,
      409,
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const label = (formData.get("label") ?? "").toString().trim();

  // --- Input validation (never trust the client) ---
  if (!label) {
    return jsonError("A label is required.", 400);
  }
  if (label.length > MAX_LABEL_LENGTH) {
    return jsonError(
      `Label must be ${MAX_LABEL_LENGTH} characters or fewer.`,
      400,
    );
  }
  if (!(file instanceof File)) {
    return jsonError("No file uploaded.", 400);
  }
  if (file.size === 0) {
    return jsonError("The file is empty.", 400);
  }
  if (file.size > MAX_RESUME_BYTES) {
    return jsonError(
      `File too large (max ${humanFileSize(MAX_RESUME_BYTES)}).`,
      413,
    );
  }
  // Declared MIME type must be PDF...
  if (file.type !== ACCEPTED_RESUME_TYPE) {
    return jsonError("Only PDF files are allowed.", 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // ...and the actual bytes must really be a PDF (defends against a renamed
  // file with a spoofed Content-Type).
  const header = new TextDecoder().decode(bytes.subarray(0, PDF_MAGIC.length));
  if (header !== PDF_MAGIC) {
    return jsonError("That file isn't a valid PDF.", 415);
  }

  // Parse BEFORE uploading so a broken PDF doesn't leave an orphan blob.
  let content: string;
  try {
    content = await extractPdfText(bytes);
  } catch (err) {
    if (err instanceof PdfTooLongError) {
      return jsonError(err.message, 413);
    }
    return jsonError(
      "Couldn't read text from this PDF. It may be corrupted.",
      422,
    );
  }

  // A scanned or image-only PDF parses but carries no text layer. Rather than
  // OCR it or store a resume the fit step can't use, ask for a readable file —
  // and bail before the blob upload so nothing is billed for an unusable file.
  if (content === "") {
    return jsonError(
      "No readable text found in this PDF — it may be a scanned image. Upload a text-based PDF.",
      422,
    );
  }

  let fileUrl: string;
  try {
    const blob = await putResume(resumeBlobPath(session.user.id, file.name), file);
    fileUrl = blob.url;
  } catch {
    return jsonError("File upload failed. Please try again.", 502);
  }

  // The blob is live but unreferenced until the row lands. If the insert fails
  // the blob would be billed forever, so it is removed before bailing out.
  let resume;
  try {
    resume = await createResumeVersion(session.user.id, {
      label,
      fileUrl,
      content,
    });
  } catch (err) {
    await deleteBlobQuietly(fileUrl);
    throw err;
  }

  return NextResponse.json({ id: resume.id }, { status: 201 });
}
