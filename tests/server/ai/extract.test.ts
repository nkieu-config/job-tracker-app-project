import { describe, it, expect, vi, beforeEach } from "vitest";

const generateContent = vi.fn();

vi.mock("@/server/ai/gemini", () => ({
  getGeminiClient: () => ({ models: { generateContent } }),
  GENERATION_MODEL: "test-generation-model",
  thinkingOffFor: () => ({ thinkingBudget: 0 }),
  billedOutputTokens: () => 0,
}));

vi.mock("@/server/observability", () => ({ recordAiUsage: vi.fn() }));

const { extractApplicationFields } = await import("@/server/ai/extract");
const { AiError } = await import("@/lib/errors");

function respond(fields: unknown) {
  generateContent.mockResolvedValue({ text: JSON.stringify(fields) });
}

beforeEach(() => {
  generateContent.mockReset();
});

describe("extractApplicationFields", () => {
  it("returns the extracted company, role and deadline", async () => {
    respond({
      company: "Acme Corp",
      role: "Senior Backend Engineer",
      deadline: "2026-08-15",
    });
    const fields = await extractApplicationFields("...jd...");
    expect(fields).toEqual({
      company: "Acme Corp",
      role: "Senior Backend Engineer",
      deadline: "2026-08-15",
    });
  });

  it("nulls a deadline that isn't a real calendar date", async () => {
    respond({ company: "Acme", role: "Dev", deadline: "2026-13-40" });
    const fields = await extractApplicationFields("...jd...");
    expect(fields.deadline).toBeNull();
  });

  it("nulls a non-ISO deadline string", async () => {
    respond({ company: "Acme", role: "Dev", deadline: "next Friday" });
    const fields = await extractApplicationFields("...jd...");
    expect(fields.deadline).toBeNull();
  });

  it("keeps an explicit null deadline", async () => {
    respond({ company: "Acme", role: "Dev", deadline: null });
    const fields = await extractApplicationFields("...jd...");
    expect(fields.deadline).toBeNull();
  });

  it("rejects malformed JSON with a recoverable AiError", async () => {
    generateContent.mockResolvedValue({ text: "not json" });
    await expect(extractApplicationFields("x")).rejects.toMatchObject({
      name: "AiError",
      kind: "malformed",
    });
  });

  it("rejects a response missing required fields", async () => {
    respond({ company: "Acme" });
    await expect(extractApplicationFields("x")).rejects.toMatchObject({
      kind: "schema",
    });
  });

  it("maps a request timeout to a timeout AiError", async () => {
    generateContent.mockRejectedValue(
      new DOMException("aborted", "TimeoutError"),
    );
    const err = await extractApplicationFields("x").catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.kind).toBe("timeout");
  });
});
