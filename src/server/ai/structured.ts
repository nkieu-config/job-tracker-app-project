import "server-only";

import { z } from "zod";
import { AiError } from "@/lib/errors";
import { recordAiUsage, type AiFeature } from "@/server/observability";
import {
  getGeminiClient,
  GENERATION_MODEL,
  thinkingOffFor,
  billedOutputTokens,
} from "./gemini";

const TIMEOUT_MS = 30_000;

// z.toJSONSchema walks the whole schema, so derive once per schema rather than
// once per request — the callers used to do this with a module-scope IIFE each.
const jsonSchemaCache = new WeakMap<z.ZodType, Record<string, unknown>>();

function responseJsonSchemaFor(schema: z.ZodType): Record<string, unknown> {
  const cached = jsonSchemaCache.get(schema);
  if (cached) return cached;
  const derived = z.toJSONSchema(schema) as Record<string, unknown>;
  delete derived["$schema"];
  jsonSchemaCache.set(schema, derived);
  return derived;
}

// The structured-output counterpart to stream.ts's generate(): one place that
// constrains the model with a schema, meters the call, and re-validates the
// reply against that same schema before anyone downstream sees it.
export async function generateStructured<T>(options: {
  schema: z.ZodType<T>;
  prompt: string;
  feature: AiFeature;
  temperature: number;
  logTag: string;
  userId?: string;
}): Promise<T> {
  const { schema, prompt, feature, temperature, logTag, userId } = options;
  const ai = getGeminiClient();

  const t0 = performance.now();
  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: responseJsonSchemaFor(schema),
        temperature,
        thinkingConfig: thinkingOffFor(GENERATION_MODEL),
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
    text = response.text;
    recordAiUsage({
      feature,
      model: GENERATION_MODEL,
      userId,
      promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: billedOutputTokens(response.usageMetadata),
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      latencyMs: performance.now() - t0,
    });
  } catch (err) {
    recordAiUsage({
      feature,
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
    console.error(`${logTag} request failed`, err);
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

  // The LLM is untrusted input: re-validate its output against the same schema
  // used to constrain it, so malformed responses become recoverable errors.
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AiError(
      "The AI response didn't match the expected format.",
      "schema",
      { cause: result.error },
    );
  }
  return result.data;
}
