import { AiError, type AiErrorKind } from "@/lib/errors";

export const STREAM_END_SENTINEL = "\u0000";

export type StreamEnd = { ok: true } | { ok: false; error: string };

const INTERRUPTED = "The AI response was interrupted before it finished.";
const DROPPED = "The connection dropped before the response finished.";

const TEXT_STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

const AI_ERROR_STATUS: Record<AiErrorKind, number> = {
  config: 503,
  transport: 502,
  timeout: 504,
  empty: 502,
  malformed: 502,
  schema: 502,
};

export function encodeStreamEnd(end: StreamEnd): string {
  return STREAM_END_SENTINEL + JSON.stringify(end);
}

function decodeStreamEnd(raw: string): StreamEnd {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as { ok?: unknown }).ok === true
    ) {
      return { ok: true };
    }
    const error = (parsed as { error?: unknown }).error;
    return { ok: false, error: typeof error === "string" ? error : INTERRUPTED };
  } catch {
    return { ok: false, error: INTERRUPTED };
  }
}

export function abortLinkedTo(signal: AbortSignal): AbortController {
  const abort = new AbortController();
  if (signal.aborted) abort.abort();
  else signal.addEventListener("abort", () => abort.abort(), { once: true });
  return abort;
}

export function aiErrorResponse(error: AiError): Response {
  return new Response(error.message, { status: AI_ERROR_STATUS[error.kind] });
}

// Wrap a stream of model tokens in a web ReadableStream the Route Handler can
// return straight to the browser as plain text. Every stream ends with a
// terminal status frame so the client can tell a completed response from a
// truncated one.
export function aiStreamResponse(
  tokens: AsyncIterable<string>,
  abort: AbortController,
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let end: StreamEnd = { ok: true };

      try {
        for await (const token of tokens) {
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        // A user navigating away aborts the request, which throws here — that's
        // a cancellation, not a model failure, so it must not be reported as one.
        if (!abort.signal.aborted) {
          end = {
            ok: false,
            error: err instanceof AiError ? err.message : INTERRUPTED,
          };
        }
      }

      try {
        controller.enqueue(encoder.encode(encodeStreamEnd(end)));
        controller.close();
      } catch {
        // The consumer is already gone; stop upstream generation too.
        abort.abort();
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(body, { headers: TEXT_STREAM_HEADERS });
}

export async function readAiStream(
  body: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
): Promise<{ text: string; end: StreamEnd }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const sentinelAt = buffer.indexOf(STREAM_END_SENTINEL);
    onText(sentinelAt === -1 ? buffer : buffer.slice(0, sentinelAt));
  }
  buffer += decoder.decode();

  const sentinelAt = buffer.indexOf(STREAM_END_SENTINEL);
  if (sentinelAt === -1) {
    return { text: buffer, end: { ok: false, error: DROPPED } };
  }
  return {
    text: buffer.slice(0, sentinelAt),
    end: decodeStreamEnd(buffer.slice(sentinelAt + STREAM_END_SENTINEL.length)),
  };
}
