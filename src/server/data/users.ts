import "server-only";

import { prisma } from "@/server/prisma";
import type { CoachAdvice } from "@/lib/schemas/coach";
import type { Prisma } from "@/generated/prisma/client";

export type CoachState = {
  coachAdvice: Prisma.JsonValue | null;
  coachHash: string | null;
  coachAt: Date | null;
};

export function getCoachState(userId: string): Promise<CoachState | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { coachAdvice: true, coachHash: true, coachAt: true },
  });
}

export async function getCoachHash(userId: string): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { coachHash: true },
  });
  return row?.coachHash ?? null;
}

export async function saveCoachAdvice(
  userId: string,
  advice: CoachAdvice,
  coachHash: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      coachAdvice: advice as unknown as Prisma.InputJsonValue,
      coachHash,
      coachAt: new Date(),
    },
  });
}
