import { getSession } from "@/server/get-session";
import { prisma } from "@/server/prisma";
import { tailorBulletsStream } from "@/server/ai-client";
import { checkAiRateLimit } from "@/server/rate-limit";
import { AiError } from "@/lib/errors";
import {
  abortLinkedTo,
  aiErrorResponse,
  aiStreamResponse,
} from "@/lib/stream-protocol";

export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  // Parsing the body doesn't depend on the lookup, so start it first and await
  // it once the row is known to exist.
  const bodyPromise = request.json().catch(() => ({}));

  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
    select: { jobDescription: true },
  });
  if (!application) {
    return new Response("Not found", { status: 404 });
  }
  if (!application.jobDescription?.trim()) {
    return new Response("Add a job description first.", { status: 400 });
  }

  const body = (await bodyPromise) as { experience?: string };
  const experience = (body.experience ?? "").toString().trim();
  if (!experience) {
    return new Response("Describe your experience first.", { status: 400 });
  }

  if (!(await checkAiRateLimit(session.user.id))) {
    return new Response("AI rate limit reached. Please try again later.", {
      status: 429,
    });
  }

  const abort = abortLinkedTo(request.signal);

  let tokens: AsyncIterable<string>;
  try {
    tokens = await tailorBulletsStream(
      application.jobDescription,
      experience,
      abort.signal,
      session.user.id,
    );
  } catch (err) {
    if (err instanceof AiError) return aiErrorResponse(err);
    throw err;
  }

  return aiStreamResponse(tokens, abort);
}
