export const GENERATION_MODEL = "gemini-3.5-flash-lite";
export const EMBEDDING_MODEL = "gemini-embedding-001";

// Bullet tailoring is held to a higher grounding bar than the extraction tasks:
// a fabricated specific here is a lie on someone's job application, not a
// mislabelled field. The harness first caught gemini-3.1-flash-lite inventing
// specifics in half its tailoring outputs (50% hallucination, grounding 3.83/5
// — below the gate), which is why the split exists.
//
// Re-measured against gemini-3.5-flash-lite, a generation newer, to see whether
// the exception had outlived its reason. It has not. The lite model clears the
// gate but only just — grounding 4.4 vs 4.83, hallucination 20% against a 20%
// ceiling — and the failure is the legible one: on the item whose source
// experience is thinnest it scored 3/5, filling the gap by inventing. The full
// flash held every item at 4 or 5 and fabricated nothing. Sitting exactly on
// the ceiling is not a margin, so tailoring alone keeps the stronger model and
// pays for it in quota (20/day against 500) and latency.
export const TAILORING_MODEL = "gemini-3.5-flash";

// Gemini flash models can spend "thinking" tokens, billed at the output rate.
// These are extraction and rewriting tasks with a fixed output shape, so
// thinking buys latency and cost, not quality — keep it off.
//
// "Off" is per-model, not one constant: gemini-3.5-flash-lite rejects a zero
// budget outright with a 400, but spends none of a small one. The full flash
// still takes zero and keeps it, because unlike the lite models it spends
// whatever budget it is given (measured: 117 thinking tokens at a budget of
// 128). The fallback is the permissive value, so an unlisted model degrades to
// a little thinking rather than a failed request.
// Keyed by model name rather than by the role constants: two roles are allowed
// to point at the same model, and computed keys would silently collapse to
// whichever came last — handing the lite model the zero budget it rejects.
const THINKING_BUDGET: Record<string, number> = {
  "gemini-3.5-flash-lite": 128,
  "gemini-3.5-flash": 0,
};

export function thinkingOffFor(model: string): { thinkingBudget: number } {
  return { thinkingBudget: THINKING_BUDGET[model] ?? 128 };
}

// Thinking tokens are billed as output. Count them so the usage dashboard
// doesn't understate cost, and so promptTokens + outputTokens reconciles with
// the totalTokenCount the API reports.
export function billedOutputTokens(usage?: {
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
}): number {
  return (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);
}
