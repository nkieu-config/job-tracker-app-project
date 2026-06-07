import { describe, it, expect } from "vitest";
import { z } from "zod";
import { jdAnalysisSchema } from "@/lib/validations/jd-analysis";

const valid = {
  summary: "A backend role.",
  seniority: "senior",
  requiredSkills: ["TypeScript"],
  niceToHave: ["Go"],
};

describe("jdAnalysisSchema (AI output validation)", () => {
  it("accepts a well-formed analysis", () => {
    expect(jdAnalysisSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an out-of-range seniority", () => {
    expect(
      jdAnalysisSchema.safeParse({ ...valid, seniority: "wizard" }).success,
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(
      jdAnalysisSchema.safeParse({ summary: "x", requiredSkills: ["a"] })
        .success,
    ).toBe(false);
  });

  it("derives a JSON schema usable as Gemini's responseJsonSchema", () => {
    const schema = z.toJSONSchema(jdAnalysisSchema) as {
      type?: string;
      properties?: Record<string, { type?: string; enum?: string[] }>;
    };
    expect(schema.type).toBe("object");
    expect(schema.properties?.requiredSkills?.type).toBe("array");
    expect(schema.properties?.seniority?.enum).toContain("senior");
  });
});
