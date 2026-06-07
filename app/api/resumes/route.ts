import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { extractPdfText } from "@/lib/pdf";
import {
  ACCEPTED_RESUME_TYPE,
  MAX_LABEL_LENGTH,
  MAX_RESUME_BYTES,
  PDF_MAGIC,
  humanFileSize,
} from "@/lib/validations/resume";

export async function POST(request: Request) {
  // Auth boundary — route handlers are independent entry points.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch {
    return NextResponse.json(
      { error: "Couldn't read text from this PDF. It may be corrupted." },
      { status: 422 },
    );
  }

  let fileUrl: string;
  try {
    const blob = await put(`resumes/${session.user.id}/${file.name}`, file, {
      access: "public",
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

  const resume = await prisma.resumeVersion.create({
    data: { userId: session.user.id, label, fileUrl, content },
  });

  return NextResponse.json({ id: resume.id }, { status: 201 });
}
