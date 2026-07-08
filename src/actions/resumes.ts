"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function deleteResume(id: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // Scope by userId so a user can only delete their own resume.
  const resume = await prisma.resumeVersion.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!resume) {
    redirect("/dashboard/resumes");
  }

  // Best-effort blob cleanup — don't block deletion of the DB row if it fails.
  if (resume.fileUrl) {
    try {
      await del(resume.fileUrl);
    } catch {
      // ignore: the row removal below is what matters to the user
    }
  }

  await prisma.resumeVersion.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/dashboard/resumes");
  redirect("/dashboard/resumes");
}
