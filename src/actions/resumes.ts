"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { requireSession } from "@/server/get-session";
import {
  getResumeFileUrl,
  deleteResumeForUser,
} from "@/server/data/resumes";

export async function deleteResume(id: string): Promise<void> {
  const session = await requireSession();

  // Scope by userId so a user can only delete their own resume.
  const resume = await getResumeFileUrl(id, session.user.id);
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

  await deleteResumeForUser(id, session.user.id);

  revalidatePath("/dashboard/resumes");
  redirect("/dashboard/resumes");
}
