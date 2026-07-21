import { getBlob } from "@/server/blob";
import { getSession } from "@/server/get-session";
import { getResumeFileUrl } from "@/server/data/resumes";
import { jsonError } from "@/lib/http";
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
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  const resume = await getResumeFileUrl(id, session.user.id);
  if (!resume || !resume.fileUrl) {
    return jsonError("Not found", 404);
  }

  const result = await getBlob(resume.fileUrl);
  if (!result || result.statusCode !== 200) {
    return jsonError("Not found", 404);
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
