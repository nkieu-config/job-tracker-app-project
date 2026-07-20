"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/server/get-session";
import {
  applicationInputSchema,
  applicationInputFromFormData,
  APPLICATION_STATUSES,
  type ApplicationInput,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { extractApplicationFields, AiError } from "@/server/ai-client";
import {
  countApplications,
  createApplicationForUser,
  updateApplicationForUser,
  deleteApplicationForUser,
  MAX_APPLICATIONS,
} from "@/server/data/applications";
import { requireAiBudget } from "@/server/ai-guard";
import { runJdAnalysis } from "@/server/workflows/analyze";
import { runResumeFit } from "@/server/workflows/resume-fit";

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
  const session = await requireSession();

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
  const session = await requireSession();

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

  const app = await createApplicationForUser(session.user.id, parsed.data);

  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard");
  redirect(`/dashboard/applications/${app.id}`);
}

export async function updateApplication(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();

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
  const updated = await updateApplicationForUser(
    id,
    session.user.id,
    parsed.data,
  );
  if (!updated) {
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
  const session = await requireSession();

  if (!APPLICATION_STATUSES.includes(status)) {
    return { error: "Invalid status." };
  }

  const updated = await updateApplicationForUser(id, session.user.id, {
    status,
  });
  if (!updated) {
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
  const session = await requireSession();

  const result = await runJdAnalysis(id, session.user.id);
  if (!result.ok) {
    return { error: result.message };
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
  const session = await requireSession();

  const result = await runResumeFit(applicationId, session.user.id);
  if (!result.ok) {
    return { error: result.message };
  }

  revalidatePath(`/dashboard/applications/${applicationId}`);
  return { success: true };
}

export async function saveTailoredBullets(
  id: string,
  experience: string,
  bullets: string,
): Promise<{ error?: string }> {
  const session = await requireSession();

  const updated = await updateApplicationForUser(id, session.user.id, {
    tailoredExperience: experience.slice(0, 4000),
    tailoredBullets: bullets.slice(0, 8000),
    tailoredAt: new Date(),
  });
  if (!updated) {
    return { error: "Application not found." };
  }

  revalidatePath(`/dashboard/applications/${id}`);
  return {};
}

export async function saveInterviewPrep(
  id: string,
  content: string,
): Promise<{ error?: string }> {
  const session = await requireSession();

  const updated = await updateApplicationForUser(id, session.user.id, {
    interviewPrep: content.slice(0, 12000),
    interviewPrepAt: new Date(),
  });
  if (!updated) {
    return { error: "Application not found." };
  }

  revalidatePath(`/dashboard/applications/${id}`);
  return {};
}

export async function deleteApplication(id: string): Promise<void> {
  const session = await requireSession();

  await deleteApplicationForUser(id, session.user.id);

  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard");
  redirect("/dashboard/applications");
}
