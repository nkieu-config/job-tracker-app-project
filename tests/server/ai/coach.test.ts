import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PipelineSnapshot } from "@/lib/insights";

const generateContent = vi.fn();

vi.mock("@/server/ai/gemini", () => ({
  getGeminiClient: () => ({ models: { generateContent } }),
  GENERATION_MODEL: "test-generation-model",
  THINKING_DISABLED: { thinkingBudget: 0 },
  billedOutputTokens: () => 0,
}));

vi.mock("@/server/observability", () => ({ recordAiUsage: vi.fn() }));

const { generateCoachAdvice, buildCoachPrompt } = await import(
  "@/server/ai/coach"
);
const { AiError } = await import("@/lib/errors");

const snapshot: PipelineSnapshot = {
  total: 8,
  analyzedCount: 5,
  statusCounts: { SAVED: 1, APPLIED: 3, INTERVIEW: 2, OFFER: 1, REJECTED: 1 },
  rates: {
    applied: 7,
    responseRate: 4 / 7,
    interviewRate: 3 / 7,
    offerRate: 1 / 7,
  },
  topMissingSkills: [
    { skill: "Kubernetes", count: 4 },
    { skill: "GraphQL", count: 2 },
  ],
  seniorityMix: { intern: 0, junior: 0, mid: 2, senior: 3, lead: 0, unknown: 0 },
};

function respond(advice: unknown) {
  generateContent.mockResolvedValue({ text: JSON.stringify(advice) });
}

const validAdvice = {
  headline: "Your response rate is healthy but Kubernetes is a recurring gap.",
  focusSkill: "Kubernetes",
  recommendations: [
    { title: "Close the Kubernetes gap", detail: "It's missing in 4 roles." },
    { title: "Keep applying", detail: "Your 57% response rate is working." },
  ],
};

beforeEach(() => {
  generateContent.mockReset();
});

describe("buildCoachPrompt", () => {
  it("includes the real rates and gap counts, never invented ones", () => {
    const prompt = buildCoachPrompt(snapshot);
    expect(prompt).toContain("Kubernetes (missing in 4)");
    expect(prompt).toContain("Response rate: 57%");
    expect(prompt).toContain("Interview rate: 43%");
    expect(prompt).toContain("senior: 3");
  });

  it("says a rate is n/a rather than 0% when nothing was applied to", () => {
    const empty: PipelineSnapshot = {
      ...snapshot,
      rates: {
        applied: 0,
        responseRate: null,
        interviewRate: null,
        offerRate: null,
      },
    };
    expect(buildCoachPrompt(empty)).toContain("Response rate: n/a");
  });
});

describe("generateCoachAdvice", () => {
  it("returns the validated advice on a well-formed response", async () => {
    respond(validAdvice);
    const advice = await generateCoachAdvice(snapshot);
    expect(advice.focusSkill).toBe("Kubernetes");
    expect(advice.recommendations).toHaveLength(2);
  });

  it("rejects malformed JSON with a recoverable AiError", async () => {
    generateContent.mockResolvedValue({ text: "not json" });
    await expect(generateCoachAdvice(snapshot)).rejects.toMatchObject({
      name: "AiError",
      kind: "malformed",
    });
  });

  it("rejects a response that doesn't match the schema", async () => {
    respond({ headline: "hi" });
    await expect(generateCoachAdvice(snapshot)).rejects.toMatchObject({
      kind: "schema",
    });
  });

  it("maps a request timeout to a timeout AiError", async () => {
    generateContent.mockRejectedValue(
      Object.assign(new DOMException("aborted", "TimeoutError")),
    );
    const err = await generateCoachAdvice(snapshot).catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.kind).toBe("timeout");
  });
});
