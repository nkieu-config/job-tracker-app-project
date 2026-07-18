import "server-only";

import { snapshotFingerprint, type PipelineSnapshot } from "@/lib/insights";
import { GENERATION_MODEL } from "@/server/ai/models";
import { sha256 } from "@/server/hash";

// The coach reads the shape of a pipeline, not a single row — below this it has
// nothing to say and the advice would be padding.
export const MIN_ANALYZED_FOR_COACH = 2;

// Fingerprints the pipeline the advice was written for. Pins the model in too,
// so advice from a different generation model doesn't read as still-current just
// because the numbers match. The action stores this on the user; the dashboard
// recomputes it to tell whether cached advice has gone stale.
export function coachSnapshotHash(snapshot: PipelineSnapshot): string {
  return sha256(`${GENERATION_MODEL}:${snapshotFingerprint(snapshot)}`);
}
