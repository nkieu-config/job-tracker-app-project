import { z } from "zod";
import { getGeminiClient, GENERATION_MODEL } from "@/server/ai/gemini";

// A model judging its own output scores it leniently (self-preference bias), so
// the judge is a different, stronger model than the one under test. Override
// with EVAL_JUDGE_MODEL; setting it equal to GENERATION_MODEL is a valid but
// self-judging configuration, and the harness says so.
export const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL ?? "gemini-2.5-pro";

export const judgeIsSelfJudging = (): boolean => JUDGE_MODEL === GENERATION_MODEL;

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

const coachRubricSchema = z.object({
  relevance: z.number().min(1).max(5),
  grounded: z.number().min(1).max(5),
  actionable: z.number().min(1).max(5),
  fabricated: z.boolean(),
  fabricatedItems: z.array(z.string()),
});

export type CoachRubric = z.infer<typeof coachRubricSchema>;

const coachResponseJsonSchema = (() => {
  const schema = z.toJSONSchema(coachRubricSchema) as Record<string, unknown>;
  delete schema["$schema"];
  return schema;
})();

// LLM-as-judge for the pipeline coach. The model sees the exact snapshot the
// advice was written from (as JSON) so it can flag any number or skill in the
// advice that isn't in the data.
export async function judgeCoach(
  snapshotJson: string,
  advice: string,
): Promise<{ rubric: CoachRubric; tokens: number }> {
  const ai = getGeminiClient();

  const prompt = `You are a strict evaluator of AI-generated job-search coaching. The coach was given ONLY the pipeline data below (as JSON) and produced the ADVICE. Score the ADVICE on a 1-5 integer scale.

- relevance: does the advice speak to THIS pipeline's situation, not generic tips? (5 = specific to the data, 1 = boilerplate).
- grounded: are all figures and skills it cites actually present in the data? (5 = every claim traceable to the data, 1 = mostly invented).
- actionable: are the recommendations concrete next steps the candidate can act on? (5 = clearly actionable, 1 = vague).
- fabricated: true if the advice states ANY number, skill, company, or fact not present in the pipeline data.
- fabricatedItems: list each invented specific (empty if none).

Judge only what is written.

PIPELINE DATA (JSON):
"""
${snapshotJson}
"""

ADVICE:
"""
${advice}
"""`;

  const res = await ai.models.generateContent({
    model: JUDGE_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: coachResponseJsonSchema,
      temperature: 0,
    },
  });

  const rubric = coachRubricSchema.parse(JSON.parse(res.text ?? "{}"));
  const tokens = res.usageMetadata?.totalTokenCount ?? 0;
  return { rubric, tokens };
}

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
    model: JUDGE_MODEL,
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
