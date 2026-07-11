import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tailorBulletsStream } from "@/server/ai/stream";
import { judgeBullets } from "../lib/judge";
import { paceGenerate } from "../lib/pace";
import { mean, percentile } from "../lib/metrics";
import type { SuiteResult, RunOptions, ItemResult } from "../lib/types";

const here = path.dirname(fileURLToPath(import.meta.url));

type TlItem = { id: string; jobDescription: string; experience: string };

async function readStream(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
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
  for (const it of data) {
    try {
      await paceGenerate();
      const t0 = performance.now();
      const res = await tailorBulletsStream(it.jobDescription, it.experience);
      const output = await readStream(res);
      const latencyMs = performance.now() - t0;
      latencies.push(latencyMs);

      await paceGenerate();
      const { rubric, tokens } = await judgeBullets(
        it.jobDescription,
        it.experience,
        output,
      );
      judged++;
      relevance.push(rubric.relevance);
      grounded.push(rubric.grounded);
      formatting.push(rubric.formatting);
      judgeTokens.push(tokens);
      if (rubric.fabricated) fabricatedCount++;

      items.push({
        id: it.id,
        latencyMs,
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
      items.push({
        id: it.id,
        latencyMs: 0,
        scores: {},
        detail: `skipped: ${(err as Error).message.slice(0, 80)}`,
      });
    }
  }

  const notes =
    judged < data.length
      ? [`${data.length - judged}/${data.length} items skipped (API error/quota)`]
      : undefined;
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
