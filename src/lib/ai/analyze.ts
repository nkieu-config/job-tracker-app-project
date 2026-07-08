import { z } from "zod";
import {
  jdAnalysisSchema,
  type JdAnalysis,
} from "@/lib/schemas/jd-analysis";
import { AiError } from "@/lib/errors";
import { getGeminiClient, GENERATION_MODEL } from "./gemini";

const TIMEOUT_MS = 30_000;

const responseJsonSchema = (() => {
  const schema = z.toJSONSchema(jdAnalysisSchema) as Record<string, unknown>;
  delete schema["$schema"];
  return schema;
})();

export async function analyzeJobDescription(
  jobDescription: string,
): Promise<JdAnalysis> {
  const ai = getGeminiClient();

  const prompt = `You are an expert technical recruiter. Analyze the job description below and extract a structured summary.

Guidelines:
- requiredSkills: concrete must-have skills or technologies (e.g. "TypeScript", "PostgreSQL", "REST APIs"). Keep each item short — no sentences.
- niceToHave: preferred or bonus skills that aren't strictly required.
- seniority: one of intern, junior, mid, senior, lead — or unknown if unclear.
- summary: one or two sentences describing the role.
Use only information present in the job description. Do not invent skills.

Job description:
"""
${jobDescription}
"""`;

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
    text = response.text;
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new AiError("The AI took too long to respond. Please try again.");
    }
    throw new AiError("The AI service failed. Please try again.");
  }

  if (!text) {
    throw new AiError("The AI returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiError("The AI returned malformed JSON.");
  }

  // The LLM is untrusted input: re-validate its output against the same schema
  // used to constrain it, so malformed responses become recoverable errors.
  const result = jdAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new AiError("The AI response didn't match the expected format.");
  }
  return result.data;
}
