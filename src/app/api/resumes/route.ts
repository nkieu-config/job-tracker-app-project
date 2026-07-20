import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getSession } from "@/server/get-session";
import { extractPdfText, PdfTooLongError } from "@/server/pdf";
import { checkUploadRateLimit } from "@/server/rate-limit";
import {
  countResumeVersions,
  createResumeVersion,
  MAX_RESUME_VERSIONS,
} from "@/server/data/resumes";
import { resumeBlobPath } from "@/lib/blob-paths";
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Bound the cost of uploading before reading the body: each version is billed
  // blob storage, a PDF parse, and an embedding on the next fit computation.
  if (!(await checkUploadRateLimit(session.user.id))) {
    return NextResponse.json(
      { error: "Upload rate limit reached. Please try again later." },
      { status: 429 },
    );
  }
  if ((await countResumeVersions(session.user.id)) >= MAX_RESUME_VERSIONS) {
    return NextResponse.json(
      {
        error: `You've reached the limit of ${MAX_RESUME_VERSIONS} resume versions. Delete one to upload another.`,
      },
      { status: 409 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const label = (formData.get("label") ?? "").toString().trim();

  // --- Input validation (never trust the client) ---
  if (!label) {
    return NextResponse.json({ error: "A label is required." }, { status: 400 });
  }
  if (label.length > MAX_LABEL_LENGTH) {
    return NextResponse.json(
      { error: `Label must be ${MAX_LABEL_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }
  if (file.size > MAX_RESUME_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${humanFileSize(MAX_RESUME_BYTES)}).` },
      { status: 413 },
    );
  }
  // Declared MIME type must be PDF...
  if (file.type !== ACCEPTED_RESUME_TYPE) {
    return NextResponse.json(
      { error: "Only PDF files are allowed." },
      { status: 415 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // ...and the actual bytes must really be a PDF (defends against a renamed
  // file with a spoofed Content-Type).
  const header = new TextDecoder().decode(bytes.subarray(0, PDF_MAGIC.length));
  if (header !== PDF_MAGIC) {
    return NextResponse.json(
      { error: "That file isn't a valid PDF." },
      { status: 415 },
    );
  }

  // Parse BEFORE uploading so a broken PDF doesn't leave an orphan blob.
  let content: string;
  try {
    content = await extractPdfText(bytes);
  } catch (err) {
    if (err instanceof PdfTooLongError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    return NextResponse.json(
      { error: "Couldn't read text from this PDF. It may be corrupted." },
      { status: 422 },
    );
  }

  let fileUrl: string;
  try {
    const blob = await put(resumeBlobPath(session.user.id, file.name), file, {
      // Private: the blob URL isn't publicly reachable. Resumes are personal
      // data — they're served only through our authenticated, ownership-scoped
      // route at /api/resumes/[id]/file.
      access: "private",
      addRandomSuffix: true,
      contentType: ACCEPTED_RESUME_TYPE,
    });
    fileUrl = blob.url;
  } catch {
    return NextResponse.json(
      { error: "File upload failed. Please try again." },
      { status: 502 },
    );
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
    await del(fileUrl).catch(() => {});
    throw err;
  }

  return NextResponse.json({ id: resume.id }, { status: 201 });
}
