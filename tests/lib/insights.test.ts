import { describe, it, expect } from "vitest";
import {
  aggregateSkillGaps,
  computeRates,
  buildPipelineSnapshot,
  snapshotFingerprint,
  type AnalyzedApplication,
} from "@/lib/insights";
import type { StoredJdAnalysis } from "@/lib/schemas/jd-analysis";

function analysis(
  over: Partial<StoredJdAnalysis> = {},
): StoredJdAnalysis {
  return {
    summary: "A role.",
    seniority: "mid",
    requiredSkills: [],
    niceToHave: [],
    ...over,
  };
}

describe("aggregateSkillGaps", () => {
  it("counts a skill once per application in which it is missing", () => {
    const gaps = aggregateSkillGaps([
      analysis({ requiredSkills: ["Kubernetes", "React"], skillMatches: ["React"] }),
      analysis({ requiredSkills: ["Kubernetes", "Go"], skillMatches: ["Go"] }),
    ]);
    expect(gaps).toEqual([{ skill: "Kubernetes", count: 2 }]);
  });

  it("ignores analyses without skillMatches — a gap is unknown, not present", () => {
    const gaps = aggregateSkillGaps([
      analysis({ requiredSkills: ["Kubernetes", "React"] }),
    ]);
    expect(gaps).toEqual([]);
  });

  it("folds aliases so React and React.js are the same gap", () => {
    const gaps = aggregateSkillGaps([
      analysis({ requiredSkills: ["React"], skillMatches: [] }),
      analysis({ requiredSkills: ["React.js"], skillMatches: [] }),
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].count).toBe(2);
  });

  it("does not double-count aliased skills within one application", () => {
    const gaps = aggregateSkillGaps([
      analysis({ requiredSkills: ["React", "React.js"], skillMatches: [] }),
    ]);
    expect(gaps).toEqual([{ skill: "React", count: 1 }]);
  });

  it("sorts by count desc, then alphabetically, and caps at topN", () => {
    const gaps = aggregateSkillGaps(
      [
        analysis({ requiredSkills: ["A", "B", "C"], skillMatches: [] }),
        analysis({ requiredSkills: ["B", "C"], skillMatches: [] }),
        analysis({ requiredSkills: ["C"], skillMatches: [] }),
      ],
      2,
    );
    expect(gaps).toEqual([
      { skill: "C", count: 3 },
      { skill: "B", count: 2 },
    ]);
  });
});

describe("computeRates", () => {
  const counts = {
    SAVED: 3,
    APPLIED: 4,
    INTERVIEW: 2,
    OFFER: 1,
    REJECTED: 3,
  };

  it("uses everything past Saved as the denominator", () => {
    const rates = computeRates(counts);
    expect(rates.applied).toBe(10);
    expect(rates.responseRate).toBeCloseTo(6 / 10);
    expect(rates.interviewRate).toBeCloseTo(3 / 10);
    expect(rates.offerRate).toBeCloseTo(1 / 10);
  });

  it("returns null rates (not 0) when nothing has been applied to", () => {
    const rates = computeRates({
      SAVED: 5,
      APPLIED: 0,
      INTERVIEW: 0,
      OFFER: 0,
      REJECTED: 0,
    });
    expect(rates.applied).toBe(0);
    expect(rates.responseRate).toBeNull();
    expect(rates.interviewRate).toBeNull();
    expect(rates.offerRate).toBeNull();
  });
});

const apps: AnalyzedApplication[] = [
  {
    status: "APPLIED",
    analysis: analysis({
      seniority: "senior",
      requiredSkills: ["Kubernetes", "Go"],
      skillMatches: ["Go"],
    }),
  },
  {
    status: "INTERVIEW",
    analysis: analysis({
      seniority: "senior",
      requiredSkills: ["Kubernetes"],
      skillMatches: [],
    }),
  },
  { status: "SAVED", analysis: null },
];

describe("buildPipelineSnapshot", () => {
  it("aggregates counts, rates, gaps and seniority in one pass", () => {
    const snap = buildPipelineSnapshot(apps);
    expect(snap.total).toBe(3);
    expect(snap.analyzedCount).toBe(2);
    expect(snap.statusCounts.APPLIED).toBe(1);
    expect(snap.statusCounts.SAVED).toBe(1);
    expect(snap.topMissingSkills).toEqual([{ skill: "Kubernetes", count: 2 }]);
    expect(snap.seniorityMix.senior).toBe(2);
    expect(snap.seniorityMix.mid).toBe(0);
    expect(snap.rates.applied).toBe(2);
  });

  it("handles an empty pipeline without dividing by zero", () => {
    const snap = buildPipelineSnapshot([]);
    expect(snap.total).toBe(0);
    expect(snap.topMissingSkills).toEqual([]);
    expect(snap.rates.responseRate).toBeNull();
  });
});

describe("snapshotFingerprint", () => {
  it("is stable for the same pipeline", () => {
    const a = buildPipelineSnapshot(apps);
    const b = buildPipelineSnapshot(apps);
    expect(snapshotFingerprint(a)).toBe(snapshotFingerprint(b));
  });

  it("changes when a status count changes", () => {
    const before = snapshotFingerprint(buildPipelineSnapshot(apps));
    const after = snapshotFingerprint(
      buildPipelineSnapshot([...apps, { status: "OFFER", analysis: null }]),
    );
    expect(after).not.toBe(before);
  });

  it("changes when the skill gaps change", () => {
    const before = snapshotFingerprint(buildPipelineSnapshot(apps));
    const after = snapshotFingerprint(
      buildPipelineSnapshot([
        ...apps,
        {
          status: "APPLIED",
          analysis: analysis({ requiredSkills: ["Rust"], skillMatches: [] }),
        },
      ]),
    );
    expect(after).not.toBe(before);
  });
});
