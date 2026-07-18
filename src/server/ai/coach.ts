import "server-only";

import { z } from "zod";
import { coachAdviceSchema, type CoachAdvice } from "@/lib/schemas/coach";
import type { PipelineSnapshot } from "@/lib/insights";
import { STATUS_LABELS } from "@/lib/schemas/application";
import { AiError } from "@/lib/errors";
import { recordAiUsage } from "@/server/observability";
import {
  getGeminiClient,
  GENERATION_MODEL,
  THINKING_DISABLED,
  billedOutputTokens,
} from "./gemini";

const TIMEOUT_MS = 30_000;

const responseJsonSchema = (() => {
  const schema = z.toJSONSchema(coachAdviceSchema) as Record<string, unknown>;
  delete schema["$schema"];
  return schema;
})();

function formatPercent(rate: number | null): string {
  return rate === null ? "n/a (nothing applied to yet)" : `${Math.round(rate * 100)}%`;
}

export function buildCoachPrompt(snapshot: PipelineSnapshot): string {
  const { rates, statusCounts, topMissingSkills, seniorityMix } = snapshot;

  const statusLine = Object.entries(statusCounts)
    .filter(([, n]) => n > 0)
    .map(([status, n]) => `${STATUS_LABELS[status as keyof typeof STATUS_LABELS]}: ${n}`)
    .join(", ");

  const gapLine = topMissingSkills.length
    ? topMissingSkills
        .map((g) => `${g.skill} (missing in ${g.count})`)
        .join(", ")
    : "none recorded yet";

  const seniorityLine = Object.entries(seniorityMix)
    .filter(([, n]) => n > 0)
    .map(([level, n]) => `${level}: ${n}`)
    .join(", ") || "unknown";

  return `You are a pragmatic job-search coach. Using ONLY the pipeline data below, write concise, actionable advice for this candidate. Do not invent numbers, companies, or skills that aren't in the data.

Pipeline data:
- Applications tracked: ${snapshot.total} (${snapshot.analyzedCount} analyzed against a resume)
- Status: ${statusLine || "none"}
- Response rate: ${formatPercent(rates.responseRate)}
- Interview rate: ${formatPercent(rates.interviewRate)}
- Offer rate: ${formatPercent(rates.offerRate)}
- Most common missing skills across roles: ${gapLine}
- Seniority of roles applied to: ${seniorityLine}

Return:
- headline: one sentence reading the overall health of this pipeline.
- focusSkill: the single skill worth closing first. It MUST be one of the missing skills listed above, copied verbatim. If none are listed, use an empty string.
- recommendations: 2 to 4 specific next actions, each with a short title and a one- or two-sentence detail. Ground every recommendation in the data above — reference the actual rates or skills, not generic advice.`;
}

export async function generateCoachAdvice(
  snapshot: PipelineSnapshot,
  userId?: string,
): Promise<CoachAdvice> {
  const ai = getGeminiClient();
  const prompt = buildCoachPrompt(snapshot);

  const t0 = performance.now();
  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
        temperature: 0.4,
        thinkingConfig: THINKING_DISABLED,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
    text = response.text;
    recordAiUsage({
      feature: "coach",
      model: GENERATION_MODEL,
      userId,
      promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: billedOutputTokens(response.usageMetadata),
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      latencyMs: performance.now() - t0,
    });
  } catch (err) {
    recordAiUsage({
      feature: "coach",
      model: GENERATION_MODEL,
      userId,
      latencyMs: performance.now() - t0,
      ok: false,
    });
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new AiError(
        "The AI took too long to respond. Please try again.",
        "timeout",
        { cause: err },
      );
    }
    console.error("[ai:coach] request failed", err);
    throw new AiError("The AI service failed. Please try again.", "transport", {
      cause: err,
    });
  }

  if (!text) {
    throw new AiError("The AI returned an empty response.", "empty");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new AiError("The AI returned malformed JSON.", "malformed", {
      cause: err,
    });
  }

  // The LLM is untrusted input: re-validate against the same schema used to
  // constrain it, so a malformed response is a recoverable error, not a crash.
  const result = coachAdviceSchema.safeParse(parsed);
  if (!result.success) {
    throw new AiError(
      "The AI response didn't match the expected format.",
      "schema",
      { cause: result.error },
    );
  }
  return result.data;
}
