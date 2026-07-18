import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateCoachAdvice } from "@/server/ai/coach";
import type { PipelineSnapshot } from "@/lib/insights";
import { canonicalSkill } from "@/lib/skills";
import { judgeCoach, JUDGE_MODEL, judgeIsSelfJudging } from "../lib/judge";
import { paceGenerate } from "../lib/pace";
import { withRetry, classify } from "../lib/retry";
import { createLatencyTimer } from "../lib/timing";
import { mean, percentile } from "../lib/metrics";
import type { SuiteResult, RunOptions, ItemResult } from "../lib/types";
import type { CoachAdvice } from "@/lib/schemas/coach";

const here = path.dirname(fileURLToPath(import.meta.url));

type CoachItem = { id: string; snapshot: PipelineSnapshot };

function adviceToText(advice: CoachAdvice): string {
  return [
    advice.headline,
    advice.focusSkill.trim() ? `Focus next on: ${advice.focusSkill}` : "",
    ...advice.recommendations.map((r) => `- ${r.title}: ${r.detail}`),
  ]
    .filter(Boolean)
    .join("\n");
}

// A model-free grounding check on the coach's single most load-bearing claim:
// the skill it tells you to prioritise must be one of the gaps actually in the
// data (or empty when there are no gaps). No judge needed — the data says so.
function focusIsGrounded(snapshot: PipelineSnapshot, advice: CoachAdvice): boolean {
  const gaps = new Set(
    snapshot.topMissingSkills.map((g) => canonicalSkill(g.skill)),
  );
  const focus = advice.focusSkill.trim();
  if (gaps.size === 0) return focus === "";
  return focus !== "" && gaps.has(canonicalSkill(focus));
}

export const name = "coach";

// LLM-as-judge over generated pipeline coaching (relevance/grounded/actionable,
// 1-5) plus a deterministic focus-skill grounding rate and hallucination rate.
export async function run(opts: RunOptions = {}): Promise<SuiteResult> {
  const raw = await readFile(
    path.resolve(here, "../datasets/coach.json"),
    "utf8",
  );
  let data: CoachItem[] = JSON.parse(raw);
  if (opts.limit) data = data.slice(0, opts.limit);

  const items: ItemResult[] = [];
  const relevance: number[] = [];
  const grounded: number[] = [];
  const actionable: number[] = [];
  const focusGrounded: number[] = [];
  const judgeTokens: number[] = [];
  let fabricatedCount = 0;

  let judged = 0;
  const latencies: number[] = [];
  const apiErrors: string[] = [];

  for (const it of data) {
    const timer = createLatencyTimer();
    let advice: CoachAdvice;

    try {
      advice = await withRetry(async () => {
        await paceGenerate();
        return timer.measure(() => generateCoachAdvice(it.snapshot));
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
      actionable.push(0);
      focusGrounded.push(0);
      items.push({
        id: it.id,
        latencyMs: timer.latencyMs,
        scores: { relevance: 0, grounded: 0, actionable: 0, focusGrounded: 0 },
        detail: `unusable output (${outcome.error.kind}): ${outcome.error.message.slice(0, 80)}`,
      });
      continue;
    }

    const focusOk = focusIsGrounded(it.snapshot, advice);

    try {
      const { rubric, tokens } = await withRetry(async () => {
        await paceGenerate();
        return judgeCoach(JSON.stringify(it.snapshot), adviceToText(advice));
      });
      judged++;
      relevance.push(rubric.relevance);
      grounded.push(rubric.grounded);
      actionable.push(rubric.actionable);
      focusGrounded.push(focusOk ? 1 : 0);
      judgeTokens.push(tokens);
      if (rubric.fabricated) fabricatedCount++;

      const detail = [
        focusOk ? "" : `focus "${advice.focusSkill}" not a listed gap`,
        rubric.fabricated
          ? `fabricated: ${rubric.fabricatedItems.join(", ") || "(unspecified)"}`
          : "",
      ]
        .filter(Boolean)
        .join("; ");

      items.push({
        id: it.id,
        latencyMs: timer.latencyMs,
        scores: {
          relevance: rubric.relevance,
          grounded: rubric.grounded,
          actionable: rubric.actionable,
          focusGrounded: focusOk ? 1 : 0,
        },
        detail: detail || undefined,
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
      "Pipeline coaching, LLM-as-judge rubric (1-5) + focus-skill grounding + hallucination rate",
    n: judged,
    metrics: {
      "relevance /5": mean(relevance),
      "grounded /5": mean(grounded),
      "actionable /5": mean(actionable),
      "focus grounded": judged ? mean(focusGrounded) : 0,
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
