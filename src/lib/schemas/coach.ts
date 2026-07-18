import { z } from "zod";

// The shape we force Gemini to return for the pipeline coach, and re-validate on
// the way back. Kept lenient (no length/count bounds baked into the JSON schema)
// for the same reason as the JD analyzer: the prompt drives content and the eval
// harness measures quality, while re-validation only guarantees the structure.
export const coachAdviceSchema = z.object({
  headline: z.string(),
  focusSkill: z.string(),
  recommendations: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
    }),
  ),
});

export type CoachAdvice = z.infer<typeof coachAdviceSchema>;
