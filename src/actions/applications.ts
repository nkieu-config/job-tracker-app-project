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
  analyzeJobDescription,
  embedText,
  embedDocument,
  AiError,
} from "@/server/ai-client";
import { EMBEDDING_MODEL } from "@/server/ai/models";
import { sha256 } from "@/server/hash";
import { matchSkillsSemantic } from "@/server/semantic-skills";
import { getResumeTexts } from "@/server/data/resumes";
import {
  countApplications,
  MAX_APPLICATIONS,
} from "@/server/data/applications";
import {
  saveJdEmbedding,
  saveResumeEmbedding,
  getResumesNeedingEmbedding,
} from "@/server/data/embeddings";
import { checkAiRateLimit } from "@/server/rate-limit";

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

export async function analyzeApplication(
  id: string,
  _prevState: AnalyzeState,
  _formData: FormData,
): Promise<AnalyzeState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!application) {
    return { error: "Application not found." };
  }
  if (!application.jobDescription?.trim()) {
    return { error: "Add a job description before analyzing." };
  }

  if (!(await checkAiRateLimit(session.user.id))) {
    return { error: "AI rate limit reached. Please try again later." };
  }

  // The resume read doesn't depend on the analysis, so it runs alongside the
  // multi-second Gemini call rather than waiting behind it.
  const resumesPromise = getResumeTexts(session.user.id);

  let analysis;
  try {
    analysis = await analyzeJobDescription(
      application.jobDescription,
      session.user.id,
    );
  } catch (err) {
    await resumesPromise.catch(() => {});
    return {
      error: err instanceof AiError ? err.message : "Analysis failed.",
    };
  }

  const resumes = await resumesPromise;
  const resumeText = resumes.map((r) => r.content ?? "").join("\n");
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

  // The row could have been deleted (or its JD emptied) during the multi-second
  // Gemini call. Without this check the action reports success while nothing was
  // stored, and the user sees a success state with no analysis.
  const result = await prisma.application.updateMany({
    where: { id, userId: session.user.id },
    data: { analysis: storedAnalysis, analyzedAt: new Date() },
  });
  if (result.count === 0) {
    return { error: "Application not found." };
  }

  revalidatePath(`/dashboard/applications/${id}`);
  return { success: true };
}

export type FitState = { error?: string; success?: boolean };

export async function computeResumeFit(
  applicationId: string,
  _prevState: FitState,
  _formData: FormData,
): Promise<FitState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
  });
  if (!application) {
    return { error: "Application not found." };
  }
  if (!application.jobDescription?.trim()) {
    return { error: "Add a job description before computing fit." };
  }

  const resumes = await getResumeTexts(session.user.id);
  if (!resumes.some((r) => r.content?.trim())) {
    return { error: "Upload a resume with readable text first." };
  }

  // Nothing to embed means nothing to pay for: skip the AI calls entirely, and
  // don't spend a slice of the user's hourly AI budget on a no-op re-click.
  // A vector is only current if the *same model* produced it from the same text.
  const jobDescriptionHash = sha256(application.jobDescription);
  const jdEmbeddingIsCurrent =
    application.jdEmbeddingHash === jobDescriptionHash &&
    application.jdEmbeddingModel === EMBEDDING_MODEL;
  const pending = await getResumesNeedingEmbedding(session.user.id);
  if (jdEmbeddingIsCurrent && pending.length === 0) {
    revalidatePath(`/dashboard/applications/${applicationId}`);
    return { success: true };
  }

  if (!(await checkAiRateLimit(session.user.id))) {
    return { error: "AI rate limit reached. Please try again later." };
  }

  try {
    // JD is the query; resumes are the documents (asymmetric retrieval). The JD
    // is short, so one call. Each resume is embedded as a whole document
    // (windowed and mean-pooled) rather than truncated to its first two pages,
    // so the fit score reflects the entire resume.
    const [jdVector, resumeVectors] = await Promise.all([
      jdEmbeddingIsCurrent
        ? null
        : embedText(
            application.jobDescription,
            "RETRIEVAL_QUERY",
            session.user.id,
          ),
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
