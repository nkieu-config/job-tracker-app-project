import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeJobDescription } from "@/server/ai/analyze";
import { skillPRF1, macroAverage, accuracy, mean, percentile } from "../lib/metrics";
import { paceGenerate } from "../lib/pace";
import type { SuiteResult, RunOptions, ItemResult } from "../lib/types";

const here = path.dirname(fileURLToPath(import.meta.url));

type JdItem = {
  id: string;
  jobDescription: string;
  expected: { seniority: string; requiredSkills: string[]; niceToHave?: string[] };
};

export const name = "jd-analysis";

export async function run(opts: RunOptions = {}): Promise<SuiteResult> {
  const raw = await readFile(
    path.resolve(here, "../datasets/jd-analysis.json"),
    "utf8",
  );
  let data: JdItem[] = JSON.parse(raw);
  if (opts.limit) data = data.slice(0, opts.limit);

  const items: ItemResult[] = [];
  const prf1s = [];
  const predSeniority: string[] = [];
  const goldSeniority: string[] = [];
  let schemaValid = 0;

  for (const it of data) {
    await paceGenerate();
    const t0 = performance.now();
    try {
      const res = await analyzeJobDescription(it.jobDescription);
      const latencyMs = performance.now() - t0;
      schemaValid++;
      const prf1 = skillPRF1(res.requiredSkills, it.expected.requiredSkills);
      prf1s.push(prf1);
      predSeniority.push(res.seniority);
      goldSeniority.push(it.expected.seniority);
      const seniorityOk = res.seniority === it.expected.seniority;
      const detail = [
        prf1.falseNegatives.length ? `missed: ${prf1.falseNegatives.join(", ")}` : "",
        prf1.falsePositives.length ? `extra: ${prf1.falsePositives.join(", ")}` : "",
        seniorityOk ? "" : `seniority ${res.seniority}≠${it.expected.seniority}`,
      ]
        .filter(Boolean)
        .join("; ");
      items.push({
        id: it.id,
        latencyMs,
        scores: {
          f1: prf1.f1,
          precision: prf1.precision,
          recall: prf1.recall,
          seniority: seniorityOk ? 1 : 0,
        },
        detail: detail || undefined,
      });
    } catch (err) {
      const latencyMs = performance.now() - t0;
      predSeniority.push("<error>");
      goldSeniority.push(it.expected.seniority);
      prf1s.push(skillPRF1([], it.expected.requiredSkills));
      items.push({
        id: it.id,
        latencyMs,
        scores: { f1: 0, precision: 0, recall: 0, seniority: 0 },
        detail: `error: ${(err as Error).message}`,
      });
    }
  }

  const macro = macroAverage(prf1s);
  const latencies = items.map((i) => i.latencyMs);
  return {
    name,
    description:
      "JD skill extraction (macro P/R/F1) + seniority accuracy + schema validity",
    n: data.length,
    metrics: {
      f1: macro.f1,
      precision: macro.precision,
      recall: macro.recall,
      "seniority accuracy": accuracy(predSeniority, goldSeniority),
      "schema valid": schemaValid / data.length,
    },
    timingMs: {
      mean: mean(latencies),
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
    },
    items,
  };
}
