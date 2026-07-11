export const STREAM_END_SENTINEL = "\u0000";

export type StreamEnd = { ok: true } | { ok: false; error: string };

const INTERRUPTED = "The AI response was interrupted before it finished.";
const DROPPED = "The connection dropped before the response finished.";

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
