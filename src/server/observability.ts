import "server-only";

import { after } from "next/server";

export const AI_FEATURES = [
  "analyze",
  "embed",
  "tailor",
  "interview",
  "coach",
  "autofill",
] as const;

export type AiFeature = (typeof AI_FEATURES)[number];

// Approximate Gemini pricing, USD per 1M tokens. Update from current rates —
// this drives the cost estimate on the AI-usage dashboard only. Keyed off the
// model constants so a swap in models.ts can't leave a live model unpriced;
// retired models stay listed so historical ai_usage rows keep their cost.
export const PRICING = {
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5 },
  "gemini-3.5-flash": { input: 0.3, output: 2.5 },
  "gemini-embedding-001": { input: 0.15, output: 0 },
  "gemini-3.1-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
} satisfies Record<string, { input: number; output: number }>;

type KnownModel = keyof typeof PRICING;

function isKnownModel(model: string): model is KnownModel {
  return model in PRICING;
}

const warnedModels = new Set<string>();

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  outputTokens: number,
): number {
  if (!isKnownModel(model)) {
    // Pricing a model at $0 would make the dashboard show cost *dropping*
    // after a model upgrade. Say so rather than reporting a confident zero.
    if (!warnedModels.has(model)) {
      warnedModels.add(model);
      console.warn(
        `[observability] No pricing for model "${model}" — its cost is reported as $0. Add it to PRICING.`,
      );
    }
    return 0;
  }
  const p = PRICING[model];
  return (promptTokens * p.input + outputTokens * p.output) / 1_000_000;
}

type UsageEntry = {
  feature: AiFeature;
  model: string;
  userId?: string;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  ok?: boolean;
};

// Usage logging must never slow down or break a feature, so the caller doesn't
// await it and every error is swallowed. It still has to survive the response
// finishing: on serverless the function is frozen the moment the response ends,
// which for a stream is the instant after the final frame is enqueued. `after()`
// keeps the insert alive past that point instead of racing the freeze.
export function recordAiUsage(entry: UsageEntry): void {
  // The eval harness imports lib/ai directly; it disables logging so eval runs
  // don't pollute production usage data.
  if (process.env.AI_USAGE_DISABLED === "1") return;
  const promptTokens = entry.promptTokens ?? 0;
  const outputTokens = entry.outputTokens ?? 0;

  // Import Prisma lazily so importing lib/ai (e.g. from the eval harness) never
  // pulls in the DB client until a real call is actually logged.
  const write = () =>
    import("@/server/prisma")
      .then(({ prisma }) =>
        prisma.aiUsage.create({
          data: {
            feature: entry.feature,
            model: entry.model,
            userId: entry.userId,
            promptTokens,
            outputTokens,
            totalTokens: entry.totalTokens ?? promptTokens + outputTokens,
            latencyMs: Math.round(entry.latencyMs),
            ok: entry.ok ?? true,
          },
        }),
      )
      .catch(() => {});

  try {
    after(write);
  } catch {
    // Outside a request scope (scripts, tests) `after` throws — just run it.
    void write();
  }
}
