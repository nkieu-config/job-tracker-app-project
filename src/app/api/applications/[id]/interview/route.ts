import { getSession } from "@/server/get-session";
import { interviewPrepStream } from "@/server/ai-client";
import { guardAiRequest } from "@/server/ai-guard";
import { AiError } from "@/lib/errors";
import { jsonError } from "@/lib/http";
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
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;

  const guard = await guardAiRequest(id, session.user.id, {
    verb: "generating interview prep",
  });
  if (!guard.ok) {
    return jsonError(guard.denial.message, guard.denial.status);
  }

  const abort = abortLinkedTo(request.signal);

  let tokens: AsyncIterable<string>;
  try {
    tokens = await interviewPrepStream(
      guard.jobDescription,
      guard.application.role,
      abort.signal,
      session.user.id,
    );
  } catch (err) {
    if (err instanceof AiError) return aiErrorResponse(err);
    throw err;
  }

  return aiStreamResponse(tokens, abort);
}
