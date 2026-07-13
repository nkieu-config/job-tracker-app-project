import { getSession } from "@/server/get-session";
import { tailorBulletsStream } from "@/server/ai-client";
import { aiDenial, guardAiRequest } from "@/server/ai-guard";
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

  // Parsing the body doesn't depend on the lookup, so start it first and await
  // it inside the guard — once the row is known to exist, and still before the
  // rate limit, so an empty experience costs the user nothing.
  const bodyPromise = request.json().catch(() => ({}));
  let experience = "";

  const guard = await guardAiRequest(id, session.user.id, {
    verb: "tailoring bullets",
    validate: async () => {
      const body = (await bodyPromise) as { experience?: string };
      experience = (body.experience ?? "").toString().trim();
      return experience
        ? null
        : aiDenial("Describe your experience first.", 400);
    },
  });
  if (!guard.ok) {
    return jsonError(guard.denial.message, guard.denial.status);
  }

  const abort = abortLinkedTo(request.signal);

  let tokens: AsyncIterable<string>;
  try {
    tokens = await tailorBulletsStream(
      guard.jobDescription,
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
