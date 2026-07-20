import "server-only";

import {
  jdAnalysisSchema,
  storedJdAnalysisSchema,
  type StoredJdAnalysis,
} from "@/lib/schemas/jd-analysis";
import { analysisCacheHash } from "@/server/analysis-cache";
import { analyzeJobDescription, AiError } from "@/server/ai-client";
import { matchSkillsSemantic } from "@/server/semantic-skills";
import { getResumeText } from "@/server/data/resumes";
import { saveApplicationAnalysis } from "@/server/data/applications";
import { requireAiBudget, requireApplicationWithJd } from "@/server/ai-guard";
import { workflowFailed, type WorkflowResult } from "./result";

// The row could have been deleted (or its JD emptied) during the multi-second
// Gemini call. Without this check the caller reports success while nothing was
// stored, and the user sees a success state with no analysis.
async function persistAnalysis(
  id: string,
  userId: string,
  analysis: StoredJdAnalysis,
  analysisHash: string,
): Promise<WorkflowResult> {
  const saved = await saveApplicationAnalysis(
    id,
    userId,
    analysis,
    analysisHash,
  );
  return saved ? { ok: true } : workflowFailed("Application not found.");
}

export async function runJdAnalysis(
  id: string,
  userId: string,
): Promise<WorkflowResult> {
  const found = await requireApplicationWithJd(id, userId, "analyzing");
  if (!found.ok) {
    return workflowFailed(found.denial.message);
  }
  const { application, jobDescription } = found;

  const hash = analysisCacheHash(jobDescription);
  const cached =
    application.analysisHash === hash
      ? storedJdAnalysisSchema.safeParse(application.analysis)
      : null;

  if (cached?.success) {
    const extraction = jdAnalysisSchema.parse(cached.data);
    const resumeText = await getResumeText(userId);

    if (!resumeText.trim()) {
      return persistAnalysis(id, userId, extraction, hash);
    }

    const denied = await requireAiBudget(userId);
    if (denied) {
      return workflowFailed(denied.message);
    }
    const { matched } = await matchSkillsSemantic(
      extraction.requiredSkills,
      resumeText,
      userId,
    );
    return persistAnalysis(
      id,
      userId,
      { ...extraction, skillMatches: matched },
      hash,
    );
  }

  const denied = await requireAiBudget(userId);
  if (denied) {
    return workflowFailed(denied.message);
  }

  // The resume read doesn't depend on the analysis, so it runs alongside the
  // multi-second Gemini call rather than waiting behind it.
  const resumeTextPromise = getResumeText(userId);

  let analysis;
  try {
    analysis = await analyzeJobDescription(jobDescription, userId);
  } catch (err) {
    await resumeTextPromise.catch(() => {});
    return workflowFailed(
      err instanceof AiError ? err.message : "Analysis failed.",
    );
  }

  const resumeText = await resumeTextPromise;
  const storedAnalysis = resumeText.trim()
    ? {
        ...analysis,
        skillMatches: (
          await matchSkillsSemantic(analysis.requiredSkills, resumeText, userId)
        ).matched,
      }
    : analysis;

  return persistAnalysis(id, userId, storedAnalysis, hash);
}
