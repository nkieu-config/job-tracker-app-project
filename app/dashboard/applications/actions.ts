"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import {
  applicationInputSchema,
  applicationInputFromFormData,
} from "@/lib/validations/application";
import { analyzeJobDescription, AiError } from "@/lib/ai/analyze-jd";
import { embedText } from "@/lib/ai/embeddings";
import { getResumeVersions } from "@/lib/data/resumes";
import {
  saveJdEmbedding,
  saveResumeEmbedding,
  getResumesNeedingEmbedding,
} from "@/lib/data/embeddings";
import { rateLimit, AI_RATE_MAX, AI_RATE_WINDOW_MS } from "@/lib/rate-limit";

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

export type AnalyzeState = { error?: string };

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

  const limit = await rateLimit(
    `ai:${session.user.id}`,
    AI_RATE_MAX,
    AI_RATE_WINDOW_MS,
  );
  if (!limit.ok) {
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

  await prisma.application.updateMany({
    where: { id, userId: session.user.id },
    data: { analysis, analyzedAt: new Date() },
  });

  revalidatePath(`/dashboard/applications/${id}`);
  return {};
}

export type FitState = { error?: string };

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

  const limit = await rateLimit(
    `ai:${session.user.id}`,
    AI_RATE_MAX,
    AI_RATE_WINDOW_MS,
  );
  if (!limit.ok) {
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
