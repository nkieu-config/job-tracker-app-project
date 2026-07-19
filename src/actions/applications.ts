"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/get-session";
import {
  applicationInputSchema,
  applicationInputFromFormData,
  APPLICATION_STATUSES,
  type ApplicationInput,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import {
  jdAnalysisSchema,
  storedJdAnalysisSchema,
  type StoredJdAnalysis,
} from "@/lib/schemas/jd-analysis";
import { analysisCacheHash } from "@/server/analysis-cache";
import {
  analyzeJobDescription,
  embedText,
  embedDocument,
  extractApplicationFields,
  AiError,
} from "@/server/ai-client";
import { EMBEDDING_MODEL } from "@/server/ai/models";
import { sha256 } from "@/server/hash";
import { matchSkillsSemantic } from "@/server/semantic-skills";
import { getResumeText, hasResumeWithText } from "@/server/data/resumes";
import {
  countApplications,
  MAX_APPLICATIONS,
} from "@/server/data/applications";
import {
  saveJdEmbedding,
  saveResumeEmbedding,
  getResumesNeedingEmbedding,
} from "@/server/data/embeddings";
import {
  requireAiBudget,
  requireApplicationWithJd,
} from "@/server/ai-guard";

export type FormState<T = ApplicationInput> = {
  error?: string;
  fieldErrors?: Partial<Record<keyof T, string[]>>;
  values?: Partial<Record<keyof T, string>>;
};

function submittedValues(
  formData: FormData,
): Partial<Record<keyof ApplicationInput, string>> {
  const values: Partial<Record<keyof ApplicationInput, string>> = {};
  for (const key of Object.keys(applicationInputSchema.shape) as Array<
    keyof ApplicationInput
  >) {
    const value = formData.get(key);
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

export type AutofillState = {
  error?: string;
  fields?: { company: string; role: string; deadline: string | null };
};

// Below this the JD is too thin to extract anything but noise — refuse before
// spending a slice of the hourly AI budget on it.
const MIN_JD_FOR_AUTOFILL = 40;

// Called directly from the client (not form-bound): the new-application form
// isn't saved yet, so there's no row to guard — just auth, a length floor and
// the budget, then extract. Never persists; the client fills the form fields.
export async function autofillFromJd(
  jobDescription: string,
): Promise<AutofillState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const jd = jobDescription.trim();
  if (jd.length < MIN_JD_FOR_AUTOFILL) {
    return { error: "Paste a fuller job description first." };
  }

  const denied = await requireAiBudget(session.user.id);
  if (denied) return { error: denied.message };

  try {
    const fields = await extractApplicationFields(
      jd.slice(0, 20000),
      session.user.id,
    );
    return { fields };
  } catch (err) {
    return {
      error: err instanceof AiError ? err.message : "Autofill failed.",
    };
  }
}

export async function createApplication(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  // Server Actions are independent entry points — re-check auth here,
  // never rely on the page/proxy having run (CVE-2025-29927).
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const parsed = applicationInputSchema.safeParse(
    applicationInputFromFormData(formData),
  );
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: submittedValues(formData),
    };
  }

  if ((await countApplications(session.user.id)) >= MAX_APPLICATIONS) {
    return {
      error: `You've reached the limit of ${MAX_APPLICATIONS} applications. Delete one to add another.`,
      values: submittedValues(formData),
    };
  }

  const app = await prisma.application.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard");
  redirect(`/dashboard/applications/${app.id}`);
}

export async function updateApplication(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const parsed = applicationInputSchema.safeParse(
    applicationInputFromFormData(formData),
  );
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: submittedValues(formData),
    };
  }

  // Scope by userId so a user can't edit someone else's row.
  const result = await prisma.application.updateMany({
    where: { id, userId: session.user.id },
    data: parsed.data,
  });
  if (result.count === 0) {
    return { error: "Application not found." };
  }

  revalidatePath("/dashboard/applications");
  revalidatePath(`/dashboard/applications/${id}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/applications/${id}`);
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  if (!APPLICATION_STATUSES.includes(status)) {
    return { error: "Invalid status." };
  }

  const result = await prisma.application.updateMany({
    where: { id, userId: session.user.id },
    data: { status },
  });
  if (result.count === 0) {
    return { error: "Application not found." };
  }

  revalidatePath("/dashboard/applications");
  revalidatePath(`/dashboard/applications/${id}`);
  revalidatePath("/dashboard");
  return {};
}

export type AnalyzeState = { error?: string; success?: boolean };

// The row could have been deleted (or its JD emptied) during the multi-second
// Gemini call. Without this check the action reports success while nothing was
// stored, and the user sees a success state with no analysis.
async function persistAnalysis(
  id: string,
  userId: string,
  analysis: StoredJdAnalysis,
  analysisHash: string,
): Promise<AnalyzeState> {
  const result = await prisma.application.updateMany({
    where: { id, userId },
    data: { analysis, analysisHash, analyzedAt: new Date() },
  });
  if (result.count === 0) {
    return { error: "Application not found." };
  }
  revalidatePath(`/dashboard/applications/${id}`);
  return { success: true };
}

export async function analyzeApplication(
  id: string,
  _prevState: AnalyzeState,
  _formData: FormData,
): Promise<AnalyzeState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const found = await requireApplicationWithJd(
    id,
    session.user.id,
    "analyzing",
  );
  if (!found.ok) {
    return { error: found.denial.message };
  }
  const { application, jobDescription } = found;

  const hash = analysisCacheHash(jobDescription);
  const cached =
    application.analysisHash === hash
      ? storedJdAnalysisSchema.safeParse(application.analysis)
      : null;

  if (cached?.success) {
    const extraction = jdAnalysisSchema.parse(cached.data);
    const resumeText = await getResumeText(session.user.id);

    if (!resumeText.trim()) {
      return persistAnalysis(id, session.user.id, extraction, hash);
    }

    const denied = await requireAiBudget(session.user.id);
    if (denied) {
      return { error: denied.message };
    }
    const { matched } = await matchSkillsSemantic(
      extraction.requiredSkills,
      resumeText,
      session.user.id,
    );
    return persistAnalysis(
      id,
      session.user.id,
      { ...extraction, skillMatches: matched },
      hash,
    );
  }

  const denied = await requireAiBudget(session.user.id);
  if (denied) {
    return { error: denied.message };
  }

  // The resume read doesn't depend on the analysis, so it runs alongside the
  // multi-second Gemini call rather than waiting behind it.
  const resumeTextPromise = getResumeText(session.user.id);

  let analysis;
  try {
    analysis = await analyzeJobDescription(jobDescription, session.user.id);
  } catch (err) {
    await resumeTextPromise.catch(() => {});
    return {
      error: err instanceof AiError ? err.message : "Analysis failed.",
    };
  }

  const resumeText = await resumeTextPromise;
  const storedAnalysis = resumeText.trim()
    ? {
        ...analysis,
        skillMatches: (
          await matchSkillsSemantic(
            analysis.requiredSkills,
            resumeText,
            session.user.id,
          )
        ).matched,
      }
    : analysis;

  return persistAnalysis(id, session.user.id, storedAnalysis, hash);
}

export type FitState = { error?: string; success?: boolean };

export async function computeResumeFit(
  applicationId: string,
  _prevState: FitState,
  _formData: FormData,
): Promise<FitState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // Not `guardAiRequest`: this action can succeed without calling the model at
  // all (see the short-circuit below), so the budget check has to come after it.
  const found = await requireApplicationWithJd(
    applicationId,
    session.user.id,
    "computing fit",
  );
  if (!found.ok) {
    return { error: found.denial.message };
  }
  const { application, jobDescription } = found;

  if (!(await hasResumeWithText(session.user.id))) {
    return { error: "Upload a resume with readable text first." };
  }

  // Nothing to embed means nothing to pay for: skip the AI calls entirely, and
  // don't spend a slice of the user's hourly AI budget on a no-op re-click.
  // A vector is only current if the *same model* produced it from the same text.
  const jobDescriptionHash = sha256(jobDescription);
  const jdEmbeddingIsCurrent =
    application.jdEmbeddingHash === jobDescriptionHash &&
    application.jdEmbeddingModel === EMBEDDING_MODEL;
  const pending = await getResumesNeedingEmbedding(session.user.id);
  if (jdEmbeddingIsCurrent && pending.length === 0) {
    revalidatePath(`/dashboard/applications/${applicationId}`);
    return { success: true };
  }

  const denied = await requireAiBudget(session.user.id);
  if (denied) {
    return { error: denied.message };
  }

  try {
    // JD is the query; resumes are the documents (asymmetric retrieval). The JD
    // is short, so one call. Each resume is embedded as a whole document
    // (windowed and mean-pooled) rather than truncated to its first two pages,
    // so the fit score reflects the entire resume.
    const [jdVector, resumeVectors] = await Promise.all([
      jdEmbeddingIsCurrent
        ? null
        : embedText(jobDescription, "RETRIEVAL_QUERY", session.user.id),
      Promise.all(
        pending.map((resume) =>
          embedDocument(resume.content, "RETRIEVAL_DOCUMENT", session.user.id),
        ),
      ),
    ]);

    await Promise.all([
      ...(jdVector
        ? [
            saveJdEmbedding(
              applicationId,
              session.user.id,
              jdVector,
              jobDescriptionHash,
            ),
          ]
        : []),
      ...pending.map((resume, i) =>
        saveResumeEmbedding(resume.id, session.user.id, resumeVectors[i]),
      ),
    ]);
  } catch (err) {
    return {
      error: err instanceof AiError ? err.message : "Could not compute fit.",
    };
  }

  revalidatePath(`/dashboard/applications/${applicationId}`);
  return { success: true };
}

export async function saveTailoredBullets(
  id: string,
  experience: string,
  bullets: string,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await prisma.application.updateMany({
    where: { id, userId: session.user.id },
    data: {
      tailoredExperience: experience.slice(0, 4000),
      tailoredBullets: bullets.slice(0, 8000),
      tailoredAt: new Date(),
    },
  });
  if (result.count === 0) {
    return { error: "Application not found." };
  }

  revalidatePath(`/dashboard/applications/${id}`);
  return {};
}

export async function saveInterviewPrep(
  id: string,
  content: string,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await prisma.application.updateMany({
    where: { id, userId: session.user.id },
    data: {
      interviewPrep: content.slice(0, 12000),
      interviewPrepAt: new Date(),
    },
  });
  if (result.count === 0) {
    return { error: "Application not found." };
  }

  revalidatePath(`/dashboard/applications/${id}`);
  return {};
}

export async function deleteApplication(id: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  await prisma.application.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard");
  redirect("/dashboard/applications");
}
