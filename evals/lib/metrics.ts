import { normalizeSet } from "./normalize";

export type PRF1 = {
  precision: number;
  recall: number;
  f1: number;
  truePositives: string[];
  falsePositives: string[]; // predicted but not in gold (hallucinated / over-extracted)
  falseNegatives: string[]; // in gold but not predicted (missed)
};

// Set-based precision/recall/F1 for a single example, comparing normalized
// skill sets. Returns the disagreements too, so the report can show what the
// model over- and under-extracted.
export function skillPRF1(predicted: string[], gold: string[]): PRF1 {
  const p = normalizeSet(predicted);
  const g = normalizeSet(gold);

  const tp: string[] = [];
  const fp: string[] = [];
  for (const x of p) (g.has(x) ? tp : fp).push(x);
  const fn: string[] = [];
  for (const x of g) if (!p.has(x)) fn.push(x);

  const precision = p.size === 0 ? (g.size === 0 ? 1 : 0) : tp.length / p.size;
  const recall = g.size === 0 ? 1 : tp.length / g.size;
  const f1 =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    precision,
    recall,
    f1,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
  };
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

// Macro-average: mean of per-example scores (each example weighted equally).
export function macroAverage(scores: PRF1[]): {
  precision: number;
  recall: number;
  f1: number;
} {
  return {
    precision: mean(scores.map((s) => s.precision)),
    recall: mean(scores.map((s) => s.recall)),
    f1: mean(scores.map((s) => s.f1)),
  };
}

export function accuracy<T>(predicted: T[], gold: T[]): number {
  if (gold.length === 0) return 1;
  let correct = 0;
  for (let i = 0; i < gold.length; i++) if (predicted[i] === gold[i]) correct++;
  return correct / gold.length;
}

export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}
