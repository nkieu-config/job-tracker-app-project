import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PipelineSnapshot } from "@/lib/insights";
import { coachSnapshotHash, MIN_ANALYZED_FOR_COACH } from "@/server/coach";

const findUnique = vi.fn();
const update = vi.fn();
vi.mock("@/server/prisma", () => ({
  prisma: { user: { findUnique, update } },
}));

const getSession = vi.fn();
vi.mock("@/server/get-session", () => ({ getSession: () => getSession() }));

const getPipelineSnapshot = vi.fn();
vi.mock("@/server/data/insights", () => ({
  getPipelineSnapshot: () => getPipelineSnapshot(),
}));

class AiError extends Error {}
const generateCoachAdvice = vi.fn();
vi.mock("@/server/ai-client", () => ({
  generateCoachAdvice: (...a: unknown[]) => generateCoachAdvice(...a),
  AiError,
}));

const requireAiBudget = vi.fn();
vi.mock("@/server/ai-guard", () => ({
  requireAiBudget: () => requireAiBudget(),
}));

class RedirectError extends Error {}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { generatePipelineCoach } = await import("@/actions/insights");

const snapshot: PipelineSnapshot = {
  total: 5,
  analyzedCount: 3,
  statusCounts: { SAVED: 1, APPLIED: 2, INTERVIEW: 1, OFFER: 1, REJECTED: 0 },
  rates: { applied: 4, responseRate: 0.5, interviewRate: 0.5, offerRate: 0.25 },
  topMissingSkills: [{ skill: "Kubernetes", count: 3 }],
  seniorityMix: { intern: 0, junior: 0, mid: 1, senior: 2, lead: 0, unknown: 0 },
};

const advice = {
  headline: "Solid response rate.",
  focusSkill: "Kubernetes",
  recommendations: [{ title: "Learn k8s", detail: "It's your top gap." }],
};

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
  getSession.mockReset().mockResolvedValue({ user: { id: "u1" } });
  getPipelineSnapshot.mockReset().mockResolvedValue(snapshot);
  generateCoachAdvice.mockReset().mockResolvedValue(advice);
  requireAiBudget.mockReset().mockResolvedValue(null);
  findUnique.mockResolvedValue({ coachHash: null });
});

const run = () => generatePipelineCoach({}, new FormData());

describe("generatePipelineCoach", () => {
  it("redirects to sign-in without a session", async () => {
    getSession.mockResolvedValue(null);
    await expect(run()).rejects.toBeInstanceOf(RedirectError);
    expect(generateCoachAdvice).not.toHaveBeenCalled();
  });

  it("refuses when too few applications are analyzed", async () => {
    getPipelineSnapshot.mockResolvedValue({
      ...snapshot,
      analyzedCount: MIN_ANALYZED_FOR_COACH - 1,
    });
    const res = await run();
    expect(res.error).toMatch(/at least/i);
    expect(generateCoachAdvice).not.toHaveBeenCalled();
  });

  it("returns cached advice without spending budget when the pipeline is unchanged", async () => {
    findUnique.mockResolvedValue({
      coachHash: coachSnapshotHash(snapshot),
    });
    const res = await run();
    expect(res.success).toBe(true);
    expect(requireAiBudget).not.toHaveBeenCalled();
    expect(generateCoachAdvice).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("stops with an error when the AI budget is exhausted", async () => {
    requireAiBudget.mockResolvedValue({ message: "AI rate limit reached." });
    const res = await run();
    expect(res.error).toMatch(/rate limit/i);
    expect(generateCoachAdvice).not.toHaveBeenCalled();
  });

  it("generates, persists advice with a fresh hash, and succeeds", async () => {
    const res = await run();
    expect(res.success).toBe(true);
    expect(generateCoachAdvice).toHaveBeenCalledWith(snapshot, "u1");
    const data = update.mock.calls[0][0].data;
    expect(data.coachAdvice).toEqual(advice);
    expect(data.coachHash).toBe(coachSnapshotHash(snapshot));
    expect(data.coachAt).toBeInstanceOf(Date);
  });

  it("surfaces an AiError message and does not persist", async () => {
    generateCoachAdvice.mockRejectedValue(new AiError("The AI service failed."));
    const res = await run();
    expect(res.error).toBe("The AI service failed.");
    expect(update).not.toHaveBeenCalled();
  });
});
