import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tailorBulletsStream } from "@/server/ai/stream";
import { AiError } from "@/lib/errors";
import { judgeBullets, JUDGE_MODEL, judgeIsSelfJudging } from "../lib/judge";
import { paceGenerate } from "../lib/pace";
import { withRetry, classify } from "../lib/retry";
import { createLatencyTimer } from "../lib/timing";
import { mean, percentile } from "../lib/metrics";
import type { SuiteResult, RunOptions, ItemResult } from "../lib/types";

const here = path.dirname(fileURLToPath(import.meta.url));

type TlItem = { id: string; jobDescription: string; experience: string };

async function collect(tokens: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const token of tokens) text += token;
  if (!text.trim()) {
    throw new AiError("The AI returned an empty response.", "empty");
  }
  return text;
}

export const name = "tailoring";

// LLM-as-judge over streamed bullet output. Scores relevance/grounding/format
// (1-5) and flags hallucinations (specifics not in the inputs).
export async function run(opts: RunOptions = {}): Promise<SuiteResult> {
  const raw = await readFile(
    path.resolve(here, "../datasets/tailoring.json"),
    "utf8",
  );
  let data: TlItem[] = JSON.parse(raw);
  if (opts.limit) data = data.slice(0, opts.limit);

  const items: ItemResult[] = [];
  const relevance: number[] = [];
  const grounded: number[] = [];
  const formatting: number[] = [];
  const judgeTokens: number[] = [];
  let fabricatedCount = 0;

  let judged = 0;
  const latencies: number[] = [];
  const apiErrors: string[] = [];

  for (const it of data) {
    const timer = createLatencyTimer();
    let output: string;

    try {
      output = await withRetry(async () => {
        await paceGenerate();
        return timer.measure(async () => {
          const tokens = await tailorBulletsStream(
            it.jobDescription,
            it.experience,
          );
          return collect(tokens);
        });
      });
      latencies.push(timer.latencyMs);
    } catch (err) {
      const outcome = classify(err);

      // The API never answered: that says nothing about model quality, so the
      // item is excluded from every metric rather than scored zero.
      if (outcome.status === "api-error") {
        apiErrors.push(it.id);
        items.push({
          id: it.id,
          latencyMs: 0,
          scores: {},
          detail: `excluded — api error: ${outcome.error.message.slice(0, 80)}`,
        });
        continue;
      }

      // The model answered with nothing usable. That is a real model failure
      // and is scored, not dropped.
      judged++;
      relevance.push(0);
      grounded.push(0);
      formatting.push(0);
      items.push({
        id: it.id,
        latencyMs: timer.latencyMs,
        scores: { relevance: 0, grounded: 0, formatting: 0 },
        detail: `unusable output (${outcome.error.kind}): ${outcome.error.message.slice(0, 80)}`,
      });
      continue;
    }

    try {
      const { rubric, tokens } = await withRetry(async () => {
        await paceGenerate();
        return judgeBullets(it.jobDescription, it.experience, output);
      });
      judged++;
      relevance.push(rubric.relevance);
      grounded.push(rubric.grounded);
      formatting.push(rubric.formatting);
      judgeTokens.push(tokens);
      if (rubric.fabricated) fabricatedCount++;

      items.push({
        id: it.id,
        latencyMs: timer.latencyMs,
        scores: {
          relevance: rubric.relevance,
          grounded: rubric.grounded,
          formatting: rubric.formatting,
        },
        detail: rubric.fabricated
          ? `fabricated: ${rubric.fabricatedItems.join(", ") || "(unspecified)"}`
          : undefined,
      });
    } catch (err) {
      // The judge failed, not the model under test. Excluding is the only
      // honest option: we have an answer but no score for it.
      apiErrors.push(it.id);
      items.push({
        id: it.id,
        latencyMs: timer.latencyMs,
        scores: {},
        detail: `excluded — judge error: ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`,
      });
    }
  }

  const notes: string[] = [`Judge model: ${JUDGE_MODEL}.`];
  if (judgeIsSelfJudging()) {
    notes.push(
      `The judge is the same model as the one under test — scores are inflated by self-preference bias. Set EVAL_JUDGE_MODEL to a different model.`,
    );
  }
  if (apiErrors.length) {
    notes.push(
      `${apiErrors.length}/${data.length} items excluded after retries — the API or judge never returned a usable response (${apiErrors.join(", ")}). Metrics are over the ${judged} items actually scored.`,
    );
  }
  return {
    name,
    description:
      "Bullet tailoring, LLM-as-judge rubric (1-5) + hallucination rate",
    n: judged,
    metrics: {
      "relevance /5": mean(relevance),
      "grounded /5": mean(grounded),
      "formatting /5": mean(formatting),
      "hallucination rate": judged ? fabricatedCount / judged : 0,
      "avg judge tokens": mean(judgeTokens),
    },
    timingMs: {
      mean: mean(latencies),
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
    },
    items,
    notes,
  };
}
