import "server-only";

import { AiError } from "@/lib/errors";
import { recordAiUsage } from "@/server/observability";
import { getGeminiClient, EMBEDDING_MODEL } from "./gemini";

export const EMBEDDING_DIM = 768;

// gemini-embedding-001 accepts ~2048 input tokens per request (~8000 chars), so
// a single embed call can only ever see the head of a longer document. This is
// a model limit, not an arbitrary cap.
const MAX_INPUT_CHARS = 8000;

// A long resume (up to 50 pages) is represented by mean-pooling the embeddings
// of its windows rather than embedding only its first two pages. This bounds
// the work: at most MAX_DOC_CHUNKS windows are embedded, so a pathologically
// long document can't fan out without limit.
const MAX_DOC_CHUNKS = 12;

// The embed endpoint hard-rejects a request carrying more than 100 inputs
// ("at most 100 requests can be in one batch", HTTP 400), and a caller here is
// unbounded — a user can hold more un-embedded resumes than that. So inputs are
// split across requests that run concurrently. The character cap keeps any one
// request modest rather than enforcing a documented limit.
const MAX_BATCH_INPUTS = 16;
const MAX_BATCH_CHARS = 60_000;

function splitIntoBatches(inputs: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let chars = 0;

  for (const input of inputs) {
    const full =
      current.length >= MAX_BATCH_INPUTS ||
      (current.length > 0 && chars + input.length > MAX_BATCH_CHARS);
    if (full) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(input);
    chars += input.length;
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

export type EmbeddingTask =
  | "RETRIEVAL_QUERY"
  | "RETRIEVAL_DOCUMENT"
  | "SEMANTIC_SIMILARITY";

export async function embedText(
  text: string,
  taskType: EmbeddingTask = "SEMANTIC_SIMILARITY",
  userId?: string,
): Promise<number[]> {
  const [vector] = await embedTextBatch([text], taskType, userId);
  return vector;
}

// Split a document into windows no larger than the model's per-request limit,
// breaking on line boundaries so a window never cuts mid-line.
function windowDocument(text: string): string[] {
  const lines = text.split(/\n/);
  const windows: string[] = [];
  let current = "";
  for (const line of lines) {
    const piece = current ? `${current}\n${line}` : line;
    if (piece.length > MAX_INPUT_CHARS && current) {
      windows.push(current);
      current = line.slice(0, MAX_INPUT_CHARS);
    } else {
      current = piece.slice(0, MAX_INPUT_CHARS);
    }
    if (windows.length >= MAX_DOC_CHUNKS) break;
  }
  if (current && windows.length < MAX_DOC_CHUNKS) windows.push(current);
  return windows.length ? windows : [text.slice(0, MAX_INPUT_CHARS)];
}

function meanPool(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const pooled = new Array<number>(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) pooled[i] += v[i];
  }
  for (let i = 0; i < dim; i++) pooled[i] /= vectors.length;
  // Re-normalize so cosine distance against single-call query vectors stays
  // comparable.
  let norm = 0;
  for (const x of pooled) norm += x * x;
  norm = Math.sqrt(norm);
  return norm === 0 ? pooled : pooled.map((x) => x / norm);
}

// Embed a whole document, not just its head: window it, embed every window in
// one batched call, and mean-pool the results into a single vector. A short
// document is one window, i.e. identical to a plain embedText.
export async function embedDocument(
  text: string,
  taskType: EmbeddingTask = "RETRIEVAL_DOCUMENT",
  userId?: string,
): Promise<number[]> {
  const windows = windowDocument(text);
  const vectors = await embedTextBatch(windows, taskType, userId);
  if (vectors.length === 0) {
    throw new AiError("The document produced no embeddings.", "schema");
  }
  return vectors.length === 1 ? vectors[0] : meanPool(vectors);
}

export async function embedTextBatch(
  texts: string[],
  taskType: EmbeddingTask = "SEMANTIC_SIMILARITY",
  userId?: string,
): Promise<number[][]> {
  const inputs = texts.map((text) => text.slice(0, MAX_INPUT_CHARS));
  if (inputs.length === 0) {
    return [];
  }

  const batches = splitIntoBatches(inputs);
  const results = await Promise.all(
    batches.map((batch) => embedBatchRequest(batch, taskType, userId)),
  );
  return results.flat();
}

async function embedBatchRequest(
  inputs: string[],
  taskType: EmbeddingTask,
  userId?: string,
): Promise<number[][]> {
  const ai = getGeminiClient();

  const t0 = performance.now();
  let res;
  try {
    res = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: inputs,
      config: { taskType, outputDimensionality: EMBEDDING_DIM },
    });
  } catch (err) {
    recordAiUsage({
      feature: "embed",
      model: EMBEDDING_MODEL,
      userId,
      latencyMs: performance.now() - t0,
      ok: false,
    });
    throw new AiError(
      "Failed to generate embeddings. Please try again.",
      "transport",
      { cause: err },
    );
  }

  // The embeddings API doesn't return a token count; estimate from input size
  // (~4 chars/token) so the cost figure isn't silently zero.
  const estTokens = Math.ceil(inputs.reduce((n, s) => n + s.length, 0) / 4);
  recordAiUsage({
    feature: "embed",
    model: EMBEDDING_MODEL,
    userId,
    promptTokens: estTokens,
    totalTokens: estTokens,
    latencyMs: performance.now() - t0,
  });

  const embeddings = res.embeddings;
  if (!embeddings || embeddings.length !== inputs.length) {
    throw new AiError("The embedding batch had an unexpected size.", "schema");
  }
  return embeddings.map((embedding) => {
    const values = embedding.values;
    if (!values || values.length !== EMBEDDING_DIM) {
      throw new AiError("The embedding had an unexpected size.", "schema");
    }
    return values;
  });
}
