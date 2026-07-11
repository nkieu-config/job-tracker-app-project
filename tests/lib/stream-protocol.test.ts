import { describe, it, expect, vi } from "vitest";
import { AiError } from "@/lib/errors";
import {
  STREAM_END_SENTINEL,
  abortLinkedTo,
  aiErrorResponse,
  aiStreamResponse,
  encodeStreamEnd,
  readAiStream,
} from "@/lib/stream-protocol";

function streamOf(parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
}

function tokensOf(tokens: string[], failAtEnd?: Error): AsyncIterable<string> {
  return (async function* () {
    for (const token of tokens) yield token;
    if (failAtEnd) throw failAtEnd;
  })();
}

describe("readAiStream", () => {
  it("returns the text and ok=true when the stream ends cleanly", async () => {
    const { text, end } = await readAiStream(
      streamOf(["- one\n", "- two", encodeStreamEnd({ ok: true })]),
      () => {},
    );
    expect(text).toBe("- one\n- two");
    expect(end).toEqual({ ok: true });
  });

  it("never leaks the sentinel or status frame into the text", async () => {
    const seen: string[] = [];
    const { text } = await readAiStream(
      streamOf(["hello", encodeStreamEnd({ ok: true })]),
      (t) => seen.push(t),
    );
    expect(text).not.toContain(STREAM_END_SENTINEL);
    expect(text).not.toContain('"ok"');
    for (const partial of seen) {
      expect(partial).not.toContain(STREAM_END_SENTINEL);
      expect(partial).not.toContain('"ok"');
    }
  });

  it("surfaces a server-reported mid-stream failure", async () => {
    const { text, end } = await readAiStream(
      streamOf(["partial", encodeStreamEnd({ ok: false, error: "boom" })]),
      () => {},
    );
    expect(text).toBe("partial");
    expect(end).toEqual({ ok: false, error: "boom" });
  });

  it("reports a truncated stream that never sent a status frame", async () => {
    const { text, end } = await readAiStream(
      streamOf(["half a respo"]),
      () => {},
    );
    expect(text).toBe("half a respo");
    expect(end.ok).toBe(false);
  });

  it("handles a status frame split across chunk boundaries", async () => {
    const frame = encodeStreamEnd({ ok: true });
    const { text, end } = await readAiStream(
      streamOf(["body", frame.slice(0, 3), frame.slice(3)]),
      () => {},
    );
    expect(text).toBe("body");
    expect(end).toEqual({ ok: true });
  });

  it("treats a malformed status frame as a failure", async () => {
    const { end } = await readAiStream(
      streamOf(["body", STREAM_END_SENTINEL, "{not json"]),
      () => {},
    );
    expect(end.ok).toBe(false);
  });

  it("names a reason when a failure frame arrives without one", async () => {
    const { end } = await readAiStream(
      streamOf(["body", STREAM_END_SENTINEL, '{"ok":false}']),
      () => {},
    );
    expect(end).toEqual({
      ok: false,
      error: "The AI response was interrupted before it finished.",
    });
  });

  it("streams progressive text to the caller as chunks arrive", async () => {
    const onText = vi.fn();
    await readAiStream(
      streamOf(["a", "b", "c", encodeStreamEnd({ ok: true })]),
      onText,
    );
    expect(onText.mock.calls.map((c) => c[0])).toEqual(["a", "ab", "abc", "abc"]);
  });
});

describe("aiStreamResponse", () => {
  it("serves the tokens as plain text that is never cached", () => {
    const res = aiStreamResponse(tokensOf(["- one"]), new AbortController());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("round-trips to the browser: the text arrives and the end is clean", async () => {
    const res = aiStreamResponse(
      tokensOf(["- one\n", "- two"]),
      new AbortController(),
    );

    const { text, end } = await readAiStream(res.body!, () => {});

    expect(text).toBe("- one\n- two");
    expect(end).toEqual({ ok: true });
  });

  it("reports a mid-stream failure in-band, because the status is already sent", async () => {
    const res = aiStreamResponse(
      tokensOf(["- half"], new AiError("The AI stopped responding.", "transport")),
      new AbortController(),
    );

    expect(res.status).toBe(200);
    const { text, end } = await readAiStream(res.body!, () => {});

    expect(text).toBe("- half");
    expect(end).toEqual({ ok: false, error: "The AI stopped responding." });
  });

  it("never forwards an unexpected error's message to the browser", async () => {
    const res = aiStreamResponse(
      tokensOf(["- half"], new Error("ECONNRESET 10.0.0.3:443 key=sk-abc")),
      new AbortController(),
    );

    const { text, end } = await readAiStream(res.body!, () => {});

    expect(text).toBe("- half");
    expect(end).toEqual({
      ok: false,
      error: "The AI response was interrupted before it finished.",
    });
  });

  it("does not report a cancellation as a failure", async () => {
    const abort = new AbortController();
    abort.abort();

    const res = aiStreamResponse(
      tokensOf(["- half"], new Error("aborted")),
      abort,
    );
    const { end } = await readAiStream(res.body!, () => {});

    expect(end).toEqual({ ok: true });
  });

  it("aborts upstream generation when the consumer cancels", async () => {
    const abort = new AbortController();
    const res = aiStreamResponse(tokensOf(["- one"]), abort);

    await res.body!.cancel();

    expect(abort.signal.aborted).toBe(true);
  });
});

describe("aiErrorResponse", () => {
  it("maps the failure kind to a status a client can act on", () => {
    expect(aiErrorResponse(new AiError("no key", "config")).status).toBe(503);
    expect(aiErrorResponse(new AiError("upstream", "transport")).status).toBe(502);
    expect(aiErrorResponse(new AiError("slow", "timeout")).status).toBe(504);
  });

  it("sends the message as the body so the client can show it", async () => {
    const res = aiErrorResponse(new AiError("AI is not configured.", "config"));

    expect(await res.text()).toBe("AI is not configured.");
  });
});

describe("abortLinkedTo", () => {
  it("aborts when the request it is linked to aborts", () => {
    const request = new AbortController();
    const abort = abortLinkedTo(request.signal);

    expect(abort.signal.aborted).toBe(false);
    request.abort();

    expect(abort.signal.aborted).toBe(true);
  });

  it("starts aborted when the request is already gone", () => {
    const request = new AbortController();
    request.abort();

    expect(abortLinkedTo(request.signal).signal.aborted).toBe(true);
  });
});
