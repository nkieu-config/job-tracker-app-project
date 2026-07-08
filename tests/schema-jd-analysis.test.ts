import { describe, expect, it } from "vitest";
import {
  jdAnalysisSchema,
  storedJdAnalysisSchema,
} from "@/lib/schemas/jd-analysis";

const validAnalysis = {
  summary: "Backend role building APIs.",
  seniority: "mid",
  requiredSkills: ["TypeScript", "PostgreSQL"],
  niceToHave: ["GraphQL"],
};

describe("jdAnalysisSchema", () => {
  it("accepts a well-formed analysis", () => {
    expect(jdAnalysisSchema.parse(validAnalysis)).toEqual(validAnalysis);
  });

  it("rejects an unknown seniority level", () => {
    const result = jdAnalysisSchema.safeParse({
      ...validAnalysis,
      seniority: "principal",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string skills", () => {
    const result = jdAnalysisSchema.safeParse({
      ...validAnalysis,
      requiredSkills: [42],
    });
    expect(result.success).toBe(false);
  });
});

describe("storedJdAnalysisSchema", () => {
  it("allows optional skillMatches", () => {
    const stored = { ...validAnalysis, skillMatches: ["TypeScript"] };
    expect(storedJdAnalysisSchema.parse(stored)).toEqual(stored);
  });

  it("stays valid without skillMatches", () => {
    expect(storedJdAnalysisSchema.parse(validAnalysis)).toEqual(validAnalysis);
  });
});
