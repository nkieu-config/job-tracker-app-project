import { describe, it, expect } from "vitest";
import { parsePrepSheet, drillableQuestions } from "@/lib/prep-sheet";

// The shape interviewPrepStream's prompt asks the model for.
const SHEET = `Technical questions
- How would you design a REST API for millions of requests per day?
  Strong answers cover: contract design, caching, pagination.
- How do you approach schema changes on a live database?
  Strong answers cover: backwards-compatible migrations, rollback plans.

Behavioral questions
- Tell me about a technical decision others disagreed with.
  Strong answers cover: trade-off analysis, measurable outcomes.

Questions to ask the interviewer
- How does the team decide what to build next?
- What does on-call look like in practice?`;

describe("parsePrepSheet", () => {
  it("splits the sheet into its three contracted sections", () => {
    const { sections, raw } = parsePrepSheet(SHEET);
    expect(raw).toBeNull();
    expect(sections.map((s) => s.id)).toEqual([
      "technical",
      "behavioral",
      "interviewer",
    ]);
    expect(sections.map((s) => s.questions.length)).toEqual([2, 1, 2]);
  });

  it("pairs each answer key with the question above it", () => {
    const [technical] = parsePrepSheet(SHEET).sections;
    expect(technical.questions[0]).toEqual({
      question:
        "How would you design a REST API for millions of requests per day?",
      answerKey: "contract design, caching, pagination.",
    });
  });

  it("leaves the answer key null when the model gave none", () => {
    const asked = parsePrepSheet(SHEET).sections[2];
    expect(asked.questions.every((q) => q.answerKey === null)).toBe(true);
  });

  it("marks only the sections you answer as drillable", () => {
    const sheet = parsePrepSheet(SHEET);
    expect(sheet.sections.map((s) => s.drillable)).toEqual([true, true, false]);
    expect(drillableQuestions(sheet)).toHaveLength(3);
  });

  // The panel parses as tokens arrive, so every prefix of a valid sheet has to
  // parse into something renderable rather than throwing or losing a line.
  it("parses a sheet that is still streaming", () => {
    const partial = SHEET.slice(0, 150);
    const { sections } = parsePrepSheet(partial);
    expect(sections).toHaveLength(1);
    expect(sections[0].questions.length).toBeGreaterThan(0);
  });

  it("keeps a trailing question whose answer key has not arrived yet", () => {
    const { sections } = parsePrepSheet(
      "Technical questions\n- A question with no key yet",
    );
    expect(sections[0].questions).toEqual([
      { question: "A question with no key yet", answerKey: null },
    ]);
  });

  it("joins a wrapped question back into one line", () => {
    const { sections } = parsePrepSheet(
      "Technical questions\n- How would you scale\n  this service under load?\n  Strong answers cover: sharding.",
    );
    expect(sections[0].questions[0]).toEqual({
      question: "How would you scale this service under load?",
      answerKey: "sharding.",
    });
  });

  it("hands back the original text when it recognises no section", () => {
    const odd = "Here are some thoughts about the role.";
    expect(parsePrepSheet(odd)).toEqual({ sections: [], raw: odd });
  });

  it("tolerates a heading the model punctuated or cased differently", () => {
    const { sections } = parsePrepSheet(
      "TECHNICAL QUESTIONS:\n- One question\n",
    );
    expect(sections.map((s) => s.id)).toEqual(["technical"]);
  });

  it("returns nothing for empty output", () => {
    expect(parsePrepSheet("   ")).toEqual({ sections: [], raw: null });
  });
});
