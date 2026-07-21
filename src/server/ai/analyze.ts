import "server-only";

import {
  jdAnalysisSchema,
  type JdAnalysis,
} from "@/lib/schemas/jd-analysis";
import { generateStructured } from "./structured";
import { fenceUntrusted, UNTRUSTED_DATA_RULE } from "./prompt";

export async function analyzeJobDescription(
  jobDescription: string,
  userId?: string,
): Promise<JdAnalysis> {
  const prompt = `You are an expert technical recruiter. Analyze the job description below and extract a structured summary.

Guidelines:
- requiredSkills: concrete must-have skills or technologies (e.g. "TypeScript", "PostgreSQL", "REST APIs"). Keep each item short — no sentences.
- niceToHave: preferred or bonus skills that aren't strictly required.
- seniority: one of intern, junior, mid, senior, lead — or unknown if unclear.
- summary: one or two sentences describing the role.
Use only information present in the job description. Do not invent skills.
${UNTRUSTED_DATA_RULE}

Job description:
${fenceUntrusted(jobDescription)}`;

  return generateStructured({
    schema: jdAnalysisSchema,
    prompt,
    feature: "analyze",
    temperature: 0.2,
    logTag: "[ai:analyze]",
    userId,
  });
}
