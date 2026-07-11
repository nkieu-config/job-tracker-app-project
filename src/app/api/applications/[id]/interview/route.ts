import { getSession } from "@/server/get-session";
import { prisma } from "@/server/prisma";
import { interviewPrepStream } from "@/server/ai-client";
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
  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
    select: { jobDescription: true, role: true },
  });
  if (!application) {
    return new Response("Not found", { status: 404 });
  }
  if (!application.jobDescription?.trim()) {
    return new Response("Add a job description first.", { status: 400 });
  }

  if (!(await checkAiRateLimit(session.user.id))) {
    return new Response("AI rate limit reached. Please try again later.", {
      status: 429,
    });
  }

  const abort = abortLinkedTo(request.signal);

  let tokens: AsyncIterable<string>;
  try {
    tokens = await interviewPrepStream(
      application.jobDescription,
      application.role,
      abort.signal,
      session.user.id,
    );
  } catch (err) {
    if (err instanceof AiError) return aiErrorResponse(err);
    throw err;
  }

  return aiStreamResponse(tokens, abort);
}
