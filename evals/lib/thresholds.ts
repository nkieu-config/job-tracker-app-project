import type { SuiteResult } from "./types";

// Minimum quality a suite must clear for the run to pass. Without these the
// harness only catches infrastructure breakage: a prompt edit that halves F1
// would print a worse scorecard and still exit 0.
//
// Set from the committed scorecard with headroom for model nondeterminism —
// they are regression alarms, not targets. Raise them when a change genuinely
// moves the baseline up.
export type Threshold = { metric: string; min?: number; max?: number };

export const THRESHOLDS: Record<string, Threshold[]> = {
  "jd-analysis": [
    { metric: "f1", min: 0.75 },
    { metric: "recall", min: 0.75 },
    { metric: "seniority accuracy", min: 0.7 },
    { metric: "schema valid", min: 1 },
  ],
  "skill-match": [
    { metric: "semantic F1", min: 0.7 },
    { metric: "semantic recall", min: 0.75 },
    // The semantic layer exists to recover skills the lexical pass misses. If
    // it stops doing that, it's pure cost.
    { metric: "recall lift", min: 0 },
  ],
  tailoring: [
    { metric: "relevance /5", min: 3.5 },
    { metric: "grounded /5", min: 4 },
    { metric: "formatting /5", min: 3.5 },
    { metric: "hallucination rate", max: 0.2 },
  ],
  coach: [
    { metric: "relevance /5", min: 3.5 },
    { metric: "grounded /5", min: 4 },
    { metric: "actionable /5", min: 3.5 },
    // The focus skill it names must be a gap actually in the data. This is a
    // model-free check, so hold it high.
    { metric: "focus grounded", min: 0.8 },
    { metric: "hallucination rate", max: 0.2 },
  ],
};

function format(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

export function checkSuite(suite: SuiteResult): string[] {
  const violations: string[] = [];

  // Every metric is an average over scored items. With none, they are all 0 or
  // NaN and would trip (or vacuously pass) every threshold below.
  if (suite.n === 0) {
    return [`${suite.name}: no items were scored — metrics are meaningless`];
  }

  for (const { metric, min, max } of THRESHOLDS[suite.name] ?? []) {
    const value = suite.metrics[metric];
    if (value === undefined || Number.isNaN(value)) {
      violations.push(`${suite.name}: metric "${metric}" is missing`);
      continue;
    }
    if (min !== undefined && value < min) {
      violations.push(
        `${suite.name}: ${metric} = ${format(value)} < min ${format(min)}`,
      );
    }
    if (max !== undefined && value > max) {
      violations.push(
        `${suite.name}: ${metric} = ${format(value)} > max ${format(max)}`,
      );
    }
  }
  return violations;
}

export function checkThresholds(suites: SuiteResult[]): string[] {
  return suites.flatMap(checkSuite);
}
