"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import {
  applicationInputSchema,
  applicationInputFromFormData,
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { analyzeJobDescription, embedText, AiError } from "@/lib/ai-client";
import { matchSkillsSemantic } from "@/lib/semantic-skills";
import { getResumeVersions } from "@/lib/data/resumes";
import {
  saveJdEmbedding,
  saveResumeEmbedding,
  getResumesNeedingEmbedding,
} from "@/lib/data/embeddings";
import { checkAiRateLimit } from "@/lib/rate-limit";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

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
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
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
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
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

  let analysis;
  try {
    analysis = await analyzeJobDescription(application.jobDescription);
  } catch (err) {
    return {
      error: err instanceof AiError ? err.message : "Analysis failed.",
    };
  }

  const resumes = await getResumeVersions(session.user.id);
  const resumeText = resumes.map((r) => r.content ?? "").join("\n");
  const storedAnalysis = resumeText.trim()
    ? {
        ...analysis,
        skillMatches: (
          await matchSkillsSemantic(analysis.requiredSkills, resumeText)
        ).matched,
      }
    : analysis;

  await prisma.application.updateMany({
    where: { id, userId: session.user.id },
    data: { analysis: storedAnalysis, analyzedAt: new Date() },
  });

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

  const resumes = await getResumeVersions(session.user.id);
  if (!resumes.some((r) => r.content?.trim())) {
    return { error: "Upload a resume with readable text first." };
  }

  if (!(await checkAiRateLimit(session.user.id))) {
    return { error: "AI rate limit reached. Please try again later." };
  }

  try {
    // JD is the query; resumes are the documents (asymmetric retrieval).
    const jdVector = await embedText(application.jobDescription, "RETRIEVAL_QUERY");
    await saveJdEmbedding(applicationId, session.user.id, jdVector);

    // Embed any resume that doesn't have an embedding yet.
    const pending = await getResumesNeedingEmbedding(session.user.id);
    for (const resume of pending) {
      const vector = await embedText(resume.content, "RETRIEVAL_DOCUMENT");
      await saveResumeEmbedding(resume.id, session.user.id, vector);
    }
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
