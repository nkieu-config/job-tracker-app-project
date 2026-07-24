import { describe, it, expect } from "vitest";
import { markPosting } from "@/lib/posting-marks";

const marks = (text: string, skills: Parameters<typeof markPosting>[1]) =>
  markPosting(text, skills).segments.filter((s) => s.kind === "mark");

describe("markPosting", () => {
  it("rebuilds the original text exactly", () => {
    const text = "Ship React and TypeScript.\n\nBonus: Rust.";
    const { segments } = markPosting(text, [
      { skill: "React", matched: true },
      { skill: "Rust", matched: false },
    ]);
    expect(segments.map((s) => s.text).join("")).toBe(text);
  });

  it("carries the matched flag onto each mark", () => {
    const found = marks("We use React and Rust.", [
      { skill: "React", matched: true },
      { skill: "Rust", matched: false },
    ]);
    expect(found).toEqual([
      { kind: "mark", text: "React", skill: "React", matched: true },
      { kind: "mark", text: "Rust", skill: "Rust", matched: false },
    ]);
  });

  it("marks every occurrence, not just the first", () => {
    const found = marks("React here, React there.", [
      { skill: "React", matched: true },
    ]);
    expect(found).toHaveLength(2);
  });

  it("prefers the longest spelling so no suffix is left outside the mark", () => {
    const found = marks("Built on React.js today.", [
      { skill: "React", matched: true },
    ]);
    expect(found).toEqual([
      { kind: "mark", text: "React.js", skill: "React", matched: true },
    ]);
  });

  it("finds a skill the posting spells with an alias", () => {
    const found = marks("Deep k8s experience required.", [
      { skill: "Kubernetes", matched: false },
    ]);
    expect(found).toEqual([
      { kind: "mark", text: "k8s", skill: "Kubernetes", matched: false },
    ]);
  });

  it("matches case-insensitively but keeps the posting's own casing", () => {
    const found = marks("We use TYPESCRIPT.", [
      { skill: "TypeScript", matched: true },
    ]);
    expect(found[0].text).toBe("TYPESCRIPT");
  });

  it("respects word boundaries on both sides", () => {
    expect(marks("Go2 and Golfing", [{ skill: "Go", matched: true }])).toEqual(
      [],
    );
  });

  it("never emits overlapping marks", () => {
    const { segments } = markPosting("Design REST APIs daily.", [
      { skill: "REST APIs", matched: true },
      { skill: "REST API", matched: true },
    ]);
    expect(segments.map((s) => s.text).join("")).toBe("Design REST APIs daily.");
    expect(segments.filter((s) => s.kind === "mark")).toHaveLength(1);
  });

  // Both cases below came out of a spike over the 15 labelled job descriptions
  // in evals/datasets: 97.4% of real model output was locatable, and these are
  // the two that were not.
  it("reports a summarised skill as inferred rather than mislocating it", () => {
    const { segments, inferred } = markPosting(
      "Required: strong Python, PyTorch, and experience deploying models as services.",
      [
        { skill: "Python", matched: true },
        { skill: "Model Deployment", matched: false },
      ],
    );
    expect(inferred).toEqual([{ skill: "Model Deployment", matched: false }]);
    expect(segments.filter((s) => s.kind === "mark")).toHaveLength(1);
  });

  it("does not mark a role title that merely resembles a skill", () => {
    const { inferred } = markPosting(
      "Join our startup as a Software Engineer! We move fast.",
      [{ skill: "Software Engineering", matched: false }],
    );
    expect(inferred).toEqual([
      { skill: "Software Engineering", matched: false },
    ]);
  });

  it("returns nothing to render for an empty posting", () => {
    expect(markPosting("", [{ skill: "React", matched: true }])).toEqual({
      segments: [],
      inferred: [],
    });
  });
});
