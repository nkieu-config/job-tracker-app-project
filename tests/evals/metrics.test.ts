import { describe, it, expect } from "vitest";
import { normalizeSkill } from "../../evals/lib/normalize";
import { skillPRF1, accuracy, macroAverage } from "../../evals/lib/metrics";

describe("normalizeSkill", () => {
  it("collapses casing, versions, and aliases to one token", () => {
    expect(normalizeSkill("React.js")).toBe("react");
    expect(normalizeSkill("reactjs")).toBe("react");
    expect(normalizeSkill("React 18")).toBe("react");
    expect(normalizeSkill("  postgres ")).toBe("postgresql");
    expect(normalizeSkill("PostgreSQL")).toBe("postgresql");
    expect(normalizeSkill("Node")).toBe("node.js");
    expect(normalizeSkill("CI / CD")).toBe("ci/cd");
  });
});

describe("skillPRF1", () => {
  it("scores a perfect match as 1.0 across the board", () => {
    const r = skillPRF1(["TypeScript", "PostgreSQL"], ["typescript", "postgres"]);
    expect(r.precision).toBe(1);
    expect(r.recall).toBe(1);
    expect(r.f1).toBe(1);
  });

  it("splits precision and recall on partial overlap", () => {
    // predicted: react, vue (vue is wrong) ; gold: react, angular (angular missed)
    const r = skillPRF1(["React", "Vue"], ["React", "Angular"]);
    expect(r.precision).toBeCloseTo(0.5);
    expect(r.recall).toBeCloseTo(0.5);
    expect(r.f1).toBeCloseTo(0.5);
    expect(r.falsePositives).toContain("vue");
    expect(r.falseNegatives).toContain("angular");
  });

  it("treats two empty sets as a perfect (vacuous) score", () => {
    const r = skillPRF1([], []);
    expect(r.f1).toBe(1);
  });

  it("scores full miss as zero", () => {
    const r = skillPRF1(["Go"], ["Rust"]);
    expect(r.f1).toBe(0);
  });
});

describe("accuracy", () => {
  it("counts exact label matches", () => {
    expect(accuracy(["senior", "mid", "junior"], ["senior", "mid", "lead"])).toBeCloseTo(
      2 / 3,
    );
  });
});

describe("macroAverage", () => {
  it("averages per-example F1 equally", () => {
    const a = skillPRF1(["a"], ["a"]); // f1 1
    const b = skillPRF1(["x"], ["y"]); // f1 0
    expect(macroAverage([a, b]).f1).toBeCloseTo(0.5);
  });
});
