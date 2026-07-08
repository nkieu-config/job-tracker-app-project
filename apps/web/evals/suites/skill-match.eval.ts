import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchSkills } from "@/lib/skills";
import { matchSkillsSemantic } from "@/lib/semantic-skills";
import { skillPRF1, macroAverage, mean, percentile } from "../lib/metrics";
import type { SuiteResult, RunOptions, ItemResult } from "../lib/types";

const here = path.dirname(fileURLToPath(import.meta.url));

type SmItem = {
  id: string;
  requiredSkills: string[];
  resumeText: string;
  expectedMatched: string[];
};

export const name = "skill-match";

// Ablation: the same gold matched-skill set scored against the lexical layer
// alone vs the lexical + embedding layer. The gap is the semantic layer's lift.
export async function run(opts: RunOptions = {}): Promise<SuiteResult> {
  const raw = await readFile(
    path.resolve(here, "../datasets/skill-match.json"),
    "utf8",
  );
  let data: SmItem[] = JSON.parse(raw);
  if (opts.limit) data = data.slice(0, opts.limit);

  const items: ItemResult[] = [];
  const lexical = [];
  const semantic = [];

  for (const it of data) {
    const t0 = performance.now();
    const lex = matchSkills(it.requiredSkills, it.resumeText);
    const sem = await matchSkillsSemantic(it.requiredSkills, it.resumeText);
    const latencyMs = performance.now() - t0;

    const lexScore = skillPRF1(lex.matched, it.expectedMatched);
    const semScore = skillPRF1(sem.matched, it.expectedMatched);
    lexical.push(lexScore);
    semantic.push(semScore);

    const recovered = semScore.truePositives.filter(
      (s) => !lexScore.truePositives.includes(s),
    );
    items.push({
      id: it.id,
      latencyMs,
      scores: { lexicalF1: lexScore.f1, semanticF1: semScore.f1 },
      detail: recovered.length
        ? `semantic recovered: ${recovered.join(", ")}`
        : undefined,
    });
  }

  const lex = macroAverage(lexical);
  const sem = macroAverage(semantic);
  const latencies = items.map((i) => i.latencyMs);
  return {
    name,
    description:
      "Skill matching, lexical vs lexical+embedding (macro P/R/F1, same gold)",
    n: data.length,
    metrics: {
      "lexical F1": lex.f1,
      "semantic F1": sem.f1,
      "lexical recall": lex.recall,
      "semantic recall": sem.recall,
      "recall lift": sem.recall - lex.recall,
      "semantic precision": sem.precision,
    },
    timingMs: {
      mean: mean(latencies),
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
    },
    items,
  };
}
