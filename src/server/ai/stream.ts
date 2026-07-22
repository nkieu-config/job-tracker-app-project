import "server-only";

import {
  getGeminiClient,
  GENERATION_MODEL,
  TAILORING_MODEL,
  thinkingOffFor,
  billedOutputTokens,
} from "./gemini";
import { fenceUntrusted, UNTRUSTED_DATA_RULE } from "./prompt";
import { AiError } from "@/lib/errors";
import { recordAiUsage, type AiFeature } from "@/server/observability";

type Usage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
};
type TextChunk = { text?: string; usageMetadata?: Usage };

async function* streamTokens(
  chunks: AsyncIterable<TextChunk>,
  feature: AiFeature,
  model: string,
  startedAt: number,
  signal: AbortSignal | undefined,
  userId: string | undefined,
): AsyncGenerator<string> {
  let usage: Usage | undefined;
  let completed = false;
  let failed = false;

  try {
    for await (const chunk of chunks) {
      if (chunk.usageMetadata) usage = chunk.usageMetadata;
      if (chunk.text) yield chunk.text;
    }
    completed = true;
  } catch (err) {
    // A user navigating away aborts the request, which throws here — that's a
    // cancellation, not a model failure, so it must not inflate the error rate.
    if (signal?.aborted) return;
    failed = true;
    console.error(`[ai:${feature}] stream error`, err);
    throw new AiError(
      "The AI stopped responding before it finished.",
      "transport",
      { cause: err },
    );
  } finally {
    // A cancelled request produced no complete response — recording it as
    // either success or failure would distort the metrics, so skip it.
    if (completed || failed) {
      recordAiUsage({
        feature,
        model,
        userId,
        promptTokens: usage?.promptTokenCount ?? 0,
        outputTokens: billedOutputTokens(usage),
        totalTokens: usage?.totalTokenCount ?? 0,
        latencyMs: performance.now() - startedAt,
        ok: !failed,
      });
    }
  }
}

async function generate(
  prompt: string,
  temperature: number,
  feature: AiFeature,
  model: string,
  signal?: AbortSignal,
  userId?: string,
): Promise<AsyncIterable<string>> {
  const ai = getGeminiClient();

  const startedAt = performance.now();
  let chunks: AsyncIterable<TextChunk>;
  try {
    chunks = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        temperature,
        thinkingConfig: thinkingOffFor(model),
        abortSignal: signal,
      },
    });
  } catch (err) {
    console.error(`[ai:${feature}] request failed`, err);
    recordAiUsage({
      feature,
      model,
      userId,
      latencyMs: performance.now() - startedAt,
      ok: false,
    });
    throw new AiError("The AI service failed. Please try again.", "transport", {
      cause: err,
    });
  }

  return streamTokens(chunks, feature, model, startedAt, signal, userId);
}

export function tailorBulletsStream(
  jobDescription: string,
  experience: string,
  signal?: AbortSignal,
  userId?: string,
): Promise<AsyncIterable<string>> {
  const prompt = `You are an expert resume writer. Rewrite the candidate's experience into 3-5 strong, tailored resume bullet points for the target job.

Rules:
- Start each bullet with "- " on its own line.
- Lead with a strong action verb.
- Emphasise skills and keywords from the job description that the candidate's experience actually supports.
- Ground every bullet strictly in the candidate's experience. Do NOT introduce facts, technologies, metrics, or descriptive qualifiers (e.g. "high-throughput", "scalable", "seamless", "high-conversion", "high-volume") that the experience does not state — not even flattering ones.
- Quantify impact only with numbers the experience actually gives; never invent a metric or a scale.
- Output only the bullet points, nothing else.
- ${UNTRUSTED_DATA_RULE}

Target job description:
${fenceUntrusted(jobDescription, 6000)}

Candidate's experience:
${fenceUntrusted(experience, 4000)}`;

  return generate(prompt, 0.6, "tailor", TAILORING_MODEL, signal, userId);
}

export function interviewPrepStream(
  jobDescription: string,
  role?: string,
  signal?: AbortSignal,
  userId?: string,
): Promise<AsyncIterable<string>> {
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

  return generate(prompt, 0.4, "interview", GENERATION_MODEL, signal, userId);
}
