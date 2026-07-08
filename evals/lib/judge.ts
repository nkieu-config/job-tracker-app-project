import { z } from "zod";
import { getGeminiClient, GENERATION_MODEL } from "@/lib/ai/gemini";

// LLM-as-judge: a separate model call scores generated bullets against a
// rubric. Temperature 0 for repeatability; output is Zod-validated like any
// other model response.
const rubricSchema = z.object({
  relevance: z.number().min(1).max(5),
  grounded: z.number().min(1).max(5),
  formatting: z.number().min(1).max(5),
  fabricated: z.boolean(),
  fabricatedItems: z.array(z.string()),
});

export type Rubric = z.infer<typeof rubricSchema>;

const responseJsonSchema = (() => {
  const schema = z.toJSONSchema(rubricSchema) as Record<string, unknown>;
  delete schema["$schema"];
  return schema;
})();

export async function judgeBullets(
  jobDescription: string,
  experience: string,
  output: string,
): Promise<{ rubric: Rubric; tokens: number }> {
  const ai = getGeminiClient();

  const prompt = `You are a strict evaluator of AI-generated resume bullet points. Score the OUTPUT on a 1-5 integer scale for each criterion.

- relevance: how well the bullets target the job description (5 = tightly tailored, 1 = generic).
- grounded: are all claims supported by the candidate's experience? (5 = fully supported, 1 = mostly invented).
- formatting: proper bullet list, strong action verbs, concise, no preamble (5 = perfect).
- fabricated: true if ANY bullet introduces a specific technology, metric, company, or fact that is NOT present in the candidate's experience or the job description.
- fabricatedItems: list each invented specific (empty if none).

Judge only what is written. Do not reward or penalise length.

JOB DESCRIPTION:
"""
${jobDescription}
"""

CANDIDATE EXPERIENCE:
"""
${experience}
"""

GENERATED BULLETS:
"""
${output}
"""`;

  const res = await ai.models.generateContent({
    model: GENERATION_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema,
      temperature: 0,
    },
  });

  const rubric = rubricSchema.parse(JSON.parse(res.text ?? "{}"));
  const tokens = res.usageMetadata?.totalTokenCount ?? 0;
  return { rubric, tokens };
}
