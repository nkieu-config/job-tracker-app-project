import { describe, it, expect, vi, beforeEach } from "vitest";

const getResumeText = vi.fn();
vi.mock("@/server/data/resumes", () => ({
  getResumeText: (...a: unknown[]) => getResumeText(...a),
}));

const { resolveSkillGap } = await import("@/server/skill-gap");

beforeEach(() => {
  getResumeText.mockReset().mockResolvedValue("");
});

describe("resolveSkillGap", () => {
  it("returns null without an analysis", async () => {
    await expect(resolveSkillGap(null, "user-1")).resolves.toBeNull();
  });

  it("partitions from the stored matches without re-reading resumes", async () => {
    const gap = await resolveSkillGap(
      {
        requiredSkills: ["Go", "Kubernetes"],
        skillMatches: ["Go"],
      } as never,
      "user-1",
    );

    expect(gap).toEqual({ matched: ["Go"], missing: ["Kubernetes"] });
    expect(getResumeText).not.toHaveBeenCalled();
  });

  it("falls back to matching against the resume text when none are stored", async () => {
    getResumeText.mockResolvedValue("Experienced Go engineer");

    const gap = await resolveSkillGap(
      { requiredSkills: ["Go", "Kubernetes"] } as never,
      "user-1",
    );

    expect(getResumeText).toHaveBeenCalledWith("user-1");
    expect(gap?.matched).toContain("Go");
    expect(gap?.missing).toContain("Kubernetes");
  });

  // An analyzer that matched nothing stores [], which is not the same as an
  // older analysis that stored nothing at all. The empty array is an answer,
  // so it must not fall through to re-reading the resume.
  it("treats an empty stored match list as an answer, not a missing one", async () => {
    const gap = await resolveSkillGap(
      { requiredSkills: ["Go", "Kubernetes"], skillMatches: [] } as never,
      "user-1",
    );

    expect(gap).toEqual({ matched: [], missing: ["Go", "Kubernetes"] });
    expect(getResumeText).not.toHaveBeenCalled();
  });
});
