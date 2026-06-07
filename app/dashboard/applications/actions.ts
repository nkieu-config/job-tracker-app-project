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
