import "server-only";

import { coachAdviceSchema, type CoachAdvice } from "@/lib/schemas/coach";
import type { PipelineSnapshot } from "@/lib/insights";
import { STATUS_LABELS } from "@/lib/schemas/application";
import { generateStructured } from "./structured";
import { fenceUntrusted, UNTRUSTED_DATA_RULE } from "./prompt";

function formatPercent(rate: number | null): string {
  return rate === null ? "n/a (nothing applied to yet)" : `${Math.round(rate * 100)}%`;
}

export function buildCoachPrompt(snapshot: PipelineSnapshot): string {
  const { rates, statusCounts, topMissingSkills, seniorityMix } = snapshot;

  const statusLine = Object.entries(statusCounts)
    .filter(([, n]) => n > 0)
    .map(([status, n]) => `${STATUS_LABELS[status as keyof typeof STATUS_LABELS]}: ${n}`)
    .join(", ");

  const gapBlock = topMissingSkills.length
    ? fenceUntrusted(
        topMissingSkills
          .map((g) => `${g.skill} (missing in ${g.count})`)
          .join("\n"),
      )
    : "none recorded yet";

  const seniorityLine = Object.entries(seniorityMix)
    .filter(([, n]) => n > 0)
    .map(([level, n]) => `${level}: ${n}`)
    .join(", ") || "unknown";

  return `You are a pragmatic job-search coach. Using ONLY the pipeline data below, write concise, actionable advice for this candidate. Do not invent numbers, companies, or skills that aren't in the data.
${UNTRUSTED_DATA_RULE}

Pipeline data:
- Applications tracked: ${snapshot.total} (${snapshot.analyzedCount} analyzed against a resume)
- Status: ${statusLine || "none"}
- Response rate: ${formatPercent(rates.responseRate)}
- Interview rate: ${formatPercent(rates.interviewRate)}
- Offer rate: ${formatPercent(rates.offerRate)}
- Seniority of roles applied to: ${seniorityLine}

Most common missing skills across roles:
${gapBlock}

Return:
- headline: one sentence reading the overall health of this pipeline.
- focusSkill: the single skill worth closing first. It MUST be one of the missing skills listed above, copied verbatim. If none are listed, use an empty string.
- recommendations: 2 to 4 specific next actions, each with a short title and a one- or two-sentence detail. Ground every recommendation in the data above — reference the actual rates or skills, not generic advice.`;
}

export async function generateCoachAdvice(
  snapshot: PipelineSnapshot,
  userId?: string,
): Promise<CoachAdvice> {
  const prompt = buildCoachPrompt(snapshot);

  return generateStructured({
    schema: coachAdviceSchema,
    prompt,
    feature: "coach",
    temperature: 0.4,
    logTag: "[ai:coach]",
    userId,
  });
}
