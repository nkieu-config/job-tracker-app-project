import "server-only";

import { embedText, embedDocument, AiError } from "@/server/ai-client";
import { EMBEDDING_MODEL } from "@/server/ai/models";
import { sha256 } from "@/server/hash";
import { hasResumeWithText } from "@/server/data/resumes";
import {
  saveJdEmbedding,
  saveResumeEmbedding,
  getResumesNeedingEmbedding,
} from "@/server/data/embeddings";
import { requireAiBudget, requireApplicationWithJd } from "@/server/ai-guard";
import { workflowFailed, type WorkflowResult } from "./result";

export async function runResumeFit(
  applicationId: string,
  userId: string,
): Promise<WorkflowResult> {
  // Not `guardAiRequest`: this workflow can succeed without calling the model at
  // all (see the short-circuit below), so the budget check has to come after it.
  const found = await requireApplicationWithJd(
    applicationId,
    userId,
    "computing fit",
  );
  if (!found.ok) {
    return workflowFailed(found.denial.message);
  }
  const { application, jobDescription } = found;

  if (!(await hasResumeWithText(userId))) {
    return workflowFailed("Upload a resume with readable text first.");
  }

  // Nothing to embed means nothing to pay for: skip the AI calls entirely, and
  // don't spend a slice of the user's hourly AI budget on a no-op re-click.
  // A vector is only current if the *same model* produced it from the same text.
  const jobDescriptionHash = sha256(jobDescription);
  const jdEmbeddingIsCurrent =
    application.jdEmbeddingHash === jobDescriptionHash &&
    application.jdEmbeddingModel === EMBEDDING_MODEL;
  const pending = await getResumesNeedingEmbedding(userId);
  if (jdEmbeddingIsCurrent && pending.length === 0) {
    return { ok: true };
  }

  const denied = await requireAiBudget(userId);
  if (denied) {
    return workflowFailed(denied.message);
  }

  try {
    // JD is the query; resumes are the documents (asymmetric retrieval). The JD
    // is short, so one call. Each resume is embedded as a whole document
    // (windowed and mean-pooled) rather than truncated to its first two pages,
    // so the fit score reflects the entire resume.
    const [jdVector, resumeVectors] = await Promise.all([
      jdEmbeddingIsCurrent
        ? null
        : embedText(jobDescription, "RETRIEVAL_QUERY", userId),
      Promise.all(
        pending.map((resume) =>
          embedDocument(resume.content, "RETRIEVAL_DOCUMENT", userId),
        ),
      ),
    ]);

    await Promise.all([
      ...(jdVector
        ? [saveJdEmbedding(applicationId, userId, jdVector, jobDescriptionHash)]
        : []),
      ...pending.map((resume, i) =>
        saveResumeEmbedding(resume.id, userId, resumeVectors[i]),
      ),
    ]);
  } catch (err) {
    return workflowFailed(
      err instanceof AiError ? err.message : "Could not compute fit.",
    );
  }

  return { ok: true };
}
