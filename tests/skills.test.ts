import { describe, it, expect } from "vitest";
import { matchSkills } from "@/lib/skills";

describe("matchSkills", () => {
  it("splits required skills into matched and missing (case-insensitive)", () => {
    const { matched, missing } = matchSkills(
      ["TypeScript", "Go", "PostgreSQL"],
      "Experienced in typescript and PostgreSQL databases.",
    );
    expect(matched).toEqual(["TypeScript", "PostgreSQL"]);
    expect(missing).toEqual(["Go"]);
  });

  it("treats everything as missing when the resume is empty", () => {
    const { matched, missing } = matchSkills(["React", "Node"], "");
    expect(matched).toEqual([]);
    expect(missing).toEqual(["React", "Node"]);
  });

  it("ignores blank skill entries", () => {
    const { matched, missing } = matchSkills(["  "], "anything");
    expect(matched).toEqual([]);
    expect(missing).toEqual(["  "]);
  });

  it("returns empty arrays for no required skills", () => {
    expect(matchSkills([], "some resume text")).toEqual({
      matched: [],
      missing: [],
    });
  });
});
