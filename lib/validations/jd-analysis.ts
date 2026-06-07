import { z } from "zod";

export const SENIORITY_LEVELS = [
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
  "unknown",
] as const;

// The structure we force Gemini to return (and re-validate on the way back).
export const jdAnalysisSchema = z.object({
  summary: z.string(),
  seniority: z.enum(SENIORITY_LEVELS),
  requiredSkills: z.array(z.string()),
  niceToHave: z.array(z.string()),
});

export type JdAnalysis = z.infer<typeof jdAnalysisSchema>;
