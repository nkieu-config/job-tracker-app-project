export const GENERATION_MODEL = "gemini-3.5-flash-lite";
export const EMBEDDING_MODEL = "gemini-embedding-001";

// Bullet tailoring is held to a higher grounding bar than the extraction tasks.
// The eval harness measured gemini-3.1-flash-lite fabricating a specific in half
// its tailoring outputs (50% hallucination, grounding 3.83/5 — below the gate),
// while a full flash keeps it near zero. So tailoring alone runs on the stronger
// model; every other feature stays on the higher-quota lite model.
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
const THINKING_BUDGET: Record<string, number> = {
  [GENERATION_MODEL]: 128,
  [TAILORING_MODEL]: 0,
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
