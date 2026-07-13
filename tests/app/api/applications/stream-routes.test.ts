import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiError } from "@/lib/errors";
import { readAiStream } from "@/lib/stream-protocol";

const findFirst = vi.fn();
vi.mock("@/server/prisma", () => ({
  prisma: { application: { findFirst } },
}));

const getSession = vi.fn();
vi.mock("@/server/get-session", () => ({ getSession: () => getSession() }));

const checkAiRateLimit = vi.fn();
vi.mock("@/server/rate-limit", () => ({
  checkAiRateLimit: () => checkAiRateLimit(),
}));

const tailorBulletsStream = vi.fn();
const interviewPrepStream = vi.fn();
vi.mock("@/server/ai-client", () => ({
  tailorBulletsStream: (...a: unknown[]) => tailorBulletsStream(...a),
  interviewPrepStream: (...a: unknown[]) => interviewPrepStream(...a),
}));

const { POST: tailorPOST } = await import(
  "@/app/api/applications/[id]/tailor/route"
);
const { POST: interviewPOST } = await import(
  "@/app/api/applications/[id]/interview/route"
);

const OWNER = "user-owner";
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function req(body?: unknown): Request {
  return new Request("http://test/api/applications/app-1/x", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function tokens(...parts: string[]): AsyncIterable<string> {
  return (async function* () {
    for (const part of parts) yield part;
  })();
}

async function streamed(res: Response) {
  return readAiStream(res.body!, () => {});
}

beforeEach(() => {
  getSession.mockReset().mockResolvedValue({ user: { id: OWNER } });
  findFirst
    .mockReset()
    .mockResolvedValue({ jobDescription: "Senior TS role", role: "Engineer" });
  checkAiRateLimit.mockReset().mockResolvedValue(true);
  tailorBulletsStream.mockReset().mockResolvedValue(tokens("- generated"));
  interviewPrepStream.mockReset().mockResolvedValue(tokens("- generated"));
});

describe("POST /api/applications/[id]/tailor", () => {
  it("rejects an unauthenticated caller before any DB or AI work", async () => {
    getSession.mockResolvedValue(null);
    const res = await tailorPOST(req({ experience: "x" }), params("app-1"));
    expect(res.status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
    expect(tailorBulletsStream).not.toHaveBeenCalled();
  });

  it("scopes the application lookup to the caller and 404s on a miss", async () => {
    findFirst.mockResolvedValue(null);
    const res = await tailorPOST(req({ experience: "x" }), params("someone-elses"));
    expect(res.status).toBe(404);
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: "someone-elses",
      userId: OWNER,
    });
    expect(checkAiRateLimit).not.toHaveBeenCalled();
  });

  it("requires a job description", async () => {
    findFirst.mockResolvedValue({ jobDescription: "   " });
    const res = await tailorPOST(req({ experience: "x" }), params("app-1"));
    expect(res.status).toBe(400);
  });

  it("requires an experience body", async () => {
    const res = await tailorPOST(req({ experience: "  " }), params("app-1"));
    expect(res.status).toBe(400);
    expect(checkAiRateLimit).not.toHaveBeenCalled();
  });

  it("returns 429 once the AI budget is spent, without calling the model", async () => {
    checkAiRateLimit.mockResolvedValue(false);
    const res = await tailorPOST(req({ experience: "x" }), params("app-1"));
    expect(res.status).toBe(429);
    expect(tailorBulletsStream).not.toHaveBeenCalled();
  });

  it("streams the model output, terminated by a clean status frame", async () => {
    const res = await tailorPOST(req({ experience: "x" }), params("app-1"));
    expect(res.status).toBe(200);
    expect(await streamed(res)).toEqual({
      text: "- generated",
      end: { ok: true },
    });
  });

  it("maps a missing key to 503, before committing to a stream", async () => {
    tailorBulletsStream.mockRejectedValue(
      new AiError("AI is not configured.", "config"),
    );
    const res = await tailorPOST(req({ experience: "x" }), params("app-1"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "AI is not configured." });
  });

  it("maps an upstream model outage to 502", async () => {
    tailorBulletsStream.mockRejectedValue(
      new AiError("The AI service failed. Please try again.", "transport"),
    );
    const res = await tailorPOST(req({ experience: "x" }), params("app-1"));
    expect(res.status).toBe(502);
  });

  it("rethrows an unexpected error instead of dressing it up as an AI failure", async () => {
    tailorBulletsStream.mockRejectedValue(new TypeError("undefined is not a function"));
    await expect(
      tailorPOST(req({ experience: "x" }), params("app-1")),
    ).rejects.toBeInstanceOf(TypeError);
  });

  it("reports a mid-stream failure in-band, keeping the 200 it already sent", async () => {
    tailorBulletsStream.mockResolvedValue(
      (async function* () {
        yield "- half";
        throw new AiError("The AI stopped responding.", "transport");
      })(),
    );
    const res = await tailorPOST(req({ experience: "x" }), params("app-1"));
    expect(res.status).toBe(200);
    expect(await streamed(res)).toEqual({
      text: "- half",
      end: { ok: false, error: "The AI stopped responding." },
    });
  });
});

describe("POST /api/applications/[id]/interview", () => {
  it("rejects an unauthenticated caller", async () => {
    getSession.mockResolvedValue(null);
    const res = await interviewPOST(req(), params("app-1"));
    expect(res.status).toBe(401);
    expect(interviewPrepStream).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the caller and 404s on a miss", async () => {
    findFirst.mockResolvedValue(null);
    const res = await interviewPOST(req(), params("someone-elses"));
    expect(res.status).toBe(404);
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: "someone-elses",
      userId: OWNER,
    });
  });

  it("returns 429 once the AI budget is spent", async () => {
    checkAiRateLimit.mockResolvedValue(false);
    const res = await interviewPOST(req(), params("app-1"));
    expect(res.status).toBe(429);
    expect(interviewPrepStream).not.toHaveBeenCalled();
  });

  it("streams the model output, terminated by a clean status frame", async () => {
    const res = await interviewPOST(req(), params("app-1"));
    expect(res.status).toBe(200);
    expect(await streamed(res)).toEqual({
      text: "- generated",
      end: { ok: true },
    });
  });

  it("maps a missing key to 503, before committing to a stream", async () => {
    interviewPrepStream.mockRejectedValue(
      new AiError("AI is not configured.", "config"),
    );
    const res = await interviewPOST(req(), params("app-1"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "AI is not configured." });
  });

  it("rethrows an unexpected error instead of dressing it up as an AI failure", async () => {
    interviewPrepStream.mockRejectedValue(new TypeError("boom"));
    await expect(interviewPOST(req(), params("app-1"))).rejects.toBeInstanceOf(
      TypeError,
    );
  });
});
