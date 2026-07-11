import { describe, it, expect } from "vitest";
import { matchSkills, cosineSimilarity, chunkText } from "@/lib/skills";

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

  it("does not match skills inside other words", () => {
    const { matched, missing } = matchSkills(
      ["Go", "React", "Java"],
      "Wrote good reactive JavaScript code.",
    );
    expect(matched).toEqual([]);
    expect(missing).toEqual(["Go", "React", "Java"]);
  });

  it("matches known aliases in both directions", () => {
    const { matched } = matchSkills(
      ["PostgreSQL", "AWS", "Node.js", "Golang"],
      "Shipped node services on amazon web services backed by postgres, written in Go.",
    );
    expect(matched).toEqual(["PostgreSQL", "AWS", "Node.js", "Golang"]);
  });

  it("matches skills containing regex special characters", () => {
    const { matched } = matchSkills(
      ["C++", "C#", ".NET"],
      "Systems work in C++ and C#, plus dotnet APIs.",
    );
    expect(matched).toEqual(["C++", "C#", ".NET"]);
  });

  it("matches skills at word boundaries with punctuation", () => {
    const { matched } = matchSkills(
      ["React", "TypeScript"],
      "Stack: React, TypeScript.",
    );
    expect(matched).toEqual(["React", "TypeScript"]);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns 0 for zero vectors instead of NaN", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });
});

describe("chunkText", () => {
  it("groups lines into chunks up to the max length", () => {
    const text = ["a".repeat(200), "b".repeat(200), "c".repeat(50)].join("\n");
    const chunks = chunkText(text, 300);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe("a".repeat(200));
    expect(chunks[1]).toBe(`${"b".repeat(200)} ${"c".repeat(50)}`);
  });

  it("drops blank lines and caps the number of chunks", () => {
    const text = Array.from({ length: 40 }, (_, i) => `line ${i}`).join("\n\n");
    const chunks = chunkText(text, 10, 5);
    expect(chunks).toHaveLength(5);
  });

  it("returns an empty array for whitespace-only text", () => {
    expect(chunkText("  \n \n ")).toEqual([]);
  });
});
