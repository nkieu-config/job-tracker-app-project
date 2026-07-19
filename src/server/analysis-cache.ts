import "server-only";

import { GENERATION_MODEL } from "@/server/ai/models";
import { sha256 } from "@/server/hash";

export const ANALYZE_PROMPT_VERSION = 1;

export function analysisCacheHash(jobDescription: string): string {
  return sha256(
    `${GENERATION_MODEL}:v${ANALYZE_PROMPT_VERSION}:${jobDescription}`,
  );
}
