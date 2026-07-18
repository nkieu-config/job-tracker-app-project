"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/get-session";
import { getPipelineSnapshot } from "@/server/data/insights";
import { generateCoachAdvice, AiError } from "@/server/ai-client";
import { requireAiBudget } from "@/server/ai-guard";
import { MIN_ANALYZED_FOR_COACH, coachSnapshotHash } from "@/server/coach";
import type { CoachAdvice } from "@/lib/schemas/coach";
import type { Prisma } from "@/generated/prisma/client";

export type CoachState = { error?: string; success?: boolean };

export async function generatePipelineCoach(
  _prevState: CoachState,
  _formData: FormData,
): Promise<CoachState> {
  // Server Actions are independent entry points — re-check auth here,
  // never rely on the page/proxy having run (CVE-2025-29927).
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const userId = session.user.id;

  const snapshot = await getPipelineSnapshot(userId);
  if (snapshot.analyzedCount < MIN_ANALYZED_FOR_COACH) {
    return {
      error: `Analyze at least ${MIN_ANALYZED_FOR_COACH} job descriptions first — the coach needs a pipeline to read.`,
    };
  }

  const hash = coachSnapshotHash(snapshot);

  // Nothing changed since the last coaching run: the cached advice still holds,
  // so return success without spending a slice of the hourly AI budget.
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { coachHash: true },
  });
  if (existing?.coachHash === hash) {
    revalidatePath("/dashboard");
    return { success: true };
  }

  const denied = await requireAiBudget(userId);
  if (denied) return { error: denied.message };

  let advice: CoachAdvice;
  try {
    advice = await generateCoachAdvice(snapshot, userId);
  } catch (err) {
    return {
      error: err instanceof AiError ? err.message : "Coaching failed.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      coachAdvice: advice as unknown as Prisma.InputJsonValue,
      coachHash: hash,
      coachAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
