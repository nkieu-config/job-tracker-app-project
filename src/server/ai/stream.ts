import "server-only";

import {
  getGeminiClient,
  GENERATION_MODEL,
  THINKING_DISABLED,
  billedOutputTokens,
} from "./gemini";
import { fenceUntrusted, UNTRUSTED_DATA_RULE } from "./prompt";
import { recordAiUsage, type AiFeature } from "@/server/observability";
import { encodeStreamEnd } from "@/lib/stream-protocol";

type Usage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
};
type TextChunk = { text?: string; usageMetadata?: Usage };

// Wrap Gemini's async chunk iterator in a web ReadableStream so a Route Handler
// can return it straight to the browser as a plain-text token stream. Every
// stream ends with a terminal status frame (see lib/stream-protocol) so the
// client can tell a completed response from a truncated one. Token usage (on
// the final chunk) and total latency are recorded on close.
function streamResponse(
  stream: AsyncIterable<TextChunk>,
  feature: AiFeature,
  startedAt: number,
  abort: AbortController,
  userId?: string,
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let usage: Usage | undefined;
      let failure: string | undefined;
      try {
        for await (const chunk of stream) {
          if (chunk.usageMetadata) usage = chunk.usageMetadata;
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
      } catch (err) {
        // A user navigating away aborts the request, which throws here — that's
        // a cancellation, not a model failure, so it must not inflate the
        // dashboard error rate.
        if (!abort.signal.aborted) {
          failure = "The AI stopped responding before it finished.";
          console.error(`[ai:${feature}] stream error`, err);
        }
      }

      const cancelled = abort.signal.aborted;

      try {
        controller.enqueue(
          encoder.encode(
            encodeStreamEnd(
              failure ? { ok: false, error: failure } : { ok: true },
            ),
          ),
        );
        controller.close();
      } catch {
        // The consumer is already gone; stop upstream generation too.
        abort.abort();
      }

      // A cancelled request produced no complete response — recording it as
      // either success or failure would distort the metrics, so skip it.
      if (!cancelled) {
        recordAiUsage({
          feature,
          model: GENERATION_MODEL,
          userId,
          promptTokens: usage?.promptTokenCount ?? 0,
          outputTokens: billedOutputTokens(usage),
          totalTokens: usage?.totalTokenCount ?? 0,
          latencyMs: performance.now() - startedAt,
          ok: !failure,
        });
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function generate(
  prompt: string,
  temperature: number,
  feature: AiFeature,
  signal?: AbortSignal,
  userId?: string,
): Promise<Response> {
  let ai;
  try {
    ai = getGeminiClient();
  } catch {
    return new Response("AI is not configured.", { status: 503 });
  }

  const abort = new AbortController();
  if (signal) {
    if (signal.aborted) abort.abort();
    else signal.addEventListener("abort", () => abort.abort(), { once: true });
  }

  const startedAt = performance.now();
  try {
    const stream = await ai.models.generateContentStream({
      model: GENERATION_MODEL,
      contents: prompt,
      config: {
        temperature,
        thinkingConfig: THINKING_DISABLED,
        abortSignal: abort.signal,
      },
    });
    return streamResponse(stream, feature, startedAt, abort, userId);
  } catch (err) {
    console.error(`[ai:${feature}] request failed`, err);
    recordAiUsage({
      feature,
      model: GENERATION_MODEL,
      userId,
      latencyMs: performance.now() - startedAt,
      ok: false,
    });
    return new Response("The AI service failed. Please try again.", {
      status: 502,
    });
  }
}

export function tailorBulletsStream(
  jobDescription: string,
  experience: string,
  signal?: AbortSignal,
  userId?: string,
): Promise<Response> {
  const prompt = `You are an expert resume writer. Rewrite the candidate's experience into 3-5 strong, tailored resume bullet points for the target job.

Rules:
- Start each bullet with "- " on its own line.
- Lead with a strong action verb; quantify impact where the input allows.
- Emphasise skills and keywords relevant to the job description.
- Do NOT invent facts, numbers, or technologies not implied by the experience.
- Output only the bullet points, nothing else.
- ${UNTRUSTED_DATA_RULE}

Target job description:
${fenceUntrusted(jobDescription, 6000)}

Candidate's experience:
${fenceUntrusted(experience, 4000)}`;

  return generate(prompt, 0.6, "tailor", signal, userId);
}

export function interviewPrepStream(
  jobDescription: string,
  role?: string,
  signal?: AbortSignal,
  userId?: string,
): Promise<Response> {
  const prompt = `You are a senior engineering interviewer preparing a candidate for an interview${role ? ` for the role of "${role.slice(0, 200).replaceAll(/["\r\n]+/g, "'")}"` : ""}.

Based on the job description below, produce a focused interview prep sheet with exactly these sections:

Technical questions
- 5 to 7 questions targeting the specific skills and technologies in the job description.
- After each question, add one line starting with "  Strong answers cover: " summarising what a good answer includes.

Behavioral questions
- 3 questions matched to the seniority and responsibilities implied by the job description, each with the same "  Strong answers cover: " line.

Questions to ask the interviewer
- 3 thoughtful questions the candidate could ask, specific to this role.

Rules:
- Use plain text with "- " bullets and the section headings above. No markdown symbols like # or **.
- Base everything on the job description; do not invent requirements it doesn't mention.
- ${UNTRUSTED_DATA_RULE}

Job description:
${fenceUntrusted(jobDescription, 6000)}`;

  return generate(prompt, 0.4, "interview", signal, userId);
}
