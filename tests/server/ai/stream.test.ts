import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiError } from "@/lib/errors";

const generateContentStream = vi.fn();
const getGeminiClient = vi.fn();

vi.mock("@/server/ai/gemini", () => ({
  getGeminiClient: () => getGeminiClient(),
  GENERATION_MODEL: "test-generation-model",
  TAILORING_MODEL: "test-tailoring-model",
  thinkingOffFor: () => ({ thinkingBudget: 0 }),
  billedOutputTokens: (usage?: {
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  }) =>
    (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
}));

const recordAiUsage = vi.fn();
vi.mock("@/server/observability", () => ({
  recordAiUsage: (...a: unknown[]) => recordAiUsage(...a),
}));

const { tailorBulletsStream, interviewPrepStream } = await import(
  "@/server/ai/stream"
);

type Chunk = { text?: string; usageMetadata?: Record<string, number> };

const USAGE = {
  promptTokenCount: 100,
  candidatesTokenCount: 40,
  thoughtsTokenCount: 10,
  totalTokenCount: 150,
};

function modelChunks(chunks: Chunk[], failAtEnd?: Error) {
  return (async function* () {
    for (const chunk of chunks) yield chunk;
    if (failAtEnd) throw failAtEnd;
  })();
}

async function collect(tokens: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const token of tokens) text += token;
  return text;
}

const configOf = () => generateContentStream.mock.calls[0][0].config;
const promptOf = () => generateContentStream.mock.calls[0][0].contents as string;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  recordAiUsage.mockReset();
  getGeminiClient
    .mockReset()
    .mockReturnValue({ models: { generateContentStream } });
  generateContentStream
    .mockReset()
    .mockResolvedValue(
      modelChunks([
        { text: "- one\n" },
        { text: "- two" },
        { usageMetadata: USAGE },
      ]),
    );
});

describe("tailorBulletsStream", () => {
  it("yields the model's text chunks in order", async () => {
    const tokens = await tailorBulletsStream("JD", "experience");

    expect(await collect(tokens)).toBe("- one\n- two");
  });

  it("fences the job description and the experience as untrusted data", async () => {
    await tailorBulletsStream("PASTED JD", "PASTED EXPERIENCE");

    expect(promptOf()).toContain('"""\nPASTED JD\n"""');
    expect(promptOf()).toContain('"""\nPASTED EXPERIENCE\n"""');
    expect(configOf().temperature).toBe(0.6);
  });

  it("hands the abort signal to the model request", async () => {
    const abort = new AbortController();

    await tailorBulletsStream("JD", "x", abort.signal);

    expect(configOf().abortSignal).toBe(abort.signal);
  });

  it("rejects with a config error before a token exists when the key is missing", async () => {
    getGeminiClient.mockImplementation(() => {
      throw new AiError("AI is not configured.", "config");
    });

    await expect(tailorBulletsStream("JD", "x")).rejects.toMatchObject({
      kind: "config",
    });
    expect(generateContentStream).not.toHaveBeenCalled();
    expect(recordAiUsage).not.toHaveBeenCalled();
  });

  it("rejects with a transport error, and records it, when the request never opens", async () => {
    generateContentStream.mockRejectedValue(new Error("upstream refused"));

    await expect(tailorBulletsStream("JD", "x")).rejects.toMatchObject({
      kind: "transport",
    });
    expect(recordAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "tailor", ok: false }),
    );
  });

  it("throws mid-iteration, and records a failure, when the model stops responding", async () => {
    generateContentStream.mockResolvedValue(
      modelChunks([{ text: "- half" }], new Error("connection reset")),
    );

    const tokens = await tailorBulletsStream("JD", "x");
    await expect(collect(tokens)).rejects.toBeInstanceOf(AiError);
    expect(recordAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false }),
    );
  });

  it("records usage once on completion, billing thinking tokens as output", async () => {
    await collect(await tailorBulletsStream("JD", "x", undefined, "user-1"));

    expect(recordAiUsage).toHaveBeenCalledTimes(1);
    expect(recordAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "tailor",
        userId: "user-1",
        promptTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        ok: true,
      }),
    );
  });

  it("runs on the dedicated tailoring model, not the default", async () => {
    await collect(await tailorBulletsStream("JD", "x"));

    expect(generateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: "test-tailoring-model" }),
    );
    expect(recordAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "tailor", model: "test-tailoring-model" }),
    );
  });

  it("records nothing when the request is aborted, so a cancellation is not a failure", async () => {
    const abort = new AbortController();
    generateContentStream.mockResolvedValue(
      (async function* () {
        yield { text: "- one" };
        abort.abort();
        throw new Error("aborted");
      })(),
    );

    const tokens = await tailorBulletsStream("JD", "x", abort.signal);

    await expect(collect(tokens)).resolves.toBe("- one");
    expect(recordAiUsage).not.toHaveBeenCalled();
  });

  it("records nothing when the consumer walks away mid-stream", async () => {
    const tokens = await tailorBulletsStream("JD", "x");
    const iterator = tokens[Symbol.asyncIterator]();

    await iterator.next();
    await iterator.return?.();

    expect(recordAiUsage).not.toHaveBeenCalled();
  });
});

describe("interviewPrepStream", () => {
  it("names the role in the prompt and generates at a lower temperature", async () => {
    await interviewPrepStream("JD", "Staff Engineer");

    expect(promptOf()).toContain("Staff Engineer");
    expect(configOf().temperature).toBe(0.4);
  });

  it("omits the role clause when the application has no role", async () => {
    await interviewPrepStream("JD");

    expect(promptOf()).toContain("preparing a candidate for an interview.");
  });

  it("records its usage under the interview feature", async () => {
    await collect(await interviewPrepStream("JD"));

    expect(recordAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "interview", ok: true }),
    );
  });
});
