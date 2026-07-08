import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { getSession } from "@/lib/get-session";
import { getResumeVersion } from "@/lib/data/resumes";
import { ACCEPTED_RESUME_TYPE } from "@/lib/schemas/resume";

// Streams a private resume PDF. The blob store is private, so its URL isn't
// publicly reachable — access is gated here by session + ownership (the resume
// must belong to the signed-in user) before we proxy the bytes back.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resume = await getResumeVersion(id, session.user.id);
  if (!resume || !resume.fileUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(resume.fileUrl, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType ?? ACCEPTED_RESUME_TYPE,
      "Content-Length": String(result.blob.size),
      // Inline so "View PDF" opens in the browser; private so no shared caches.
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
