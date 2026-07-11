export const GENERATION_MODEL = "gemini-2.5-flash";
export const EMBEDDING_MODEL = "gemini-embedding-001";

// gemini-2.5-flash enables dynamic thinking by default, and thinking tokens are
// billed at the output rate. These are extraction and rewriting tasks with a
// fixed output shape, so thinking buys latency and cost, not quality.
export const THINKING_DISABLED = { thinkingBudget: 0 } as const;

// Thinking tokens are billed as output. Count them so the usage dashboard
// doesn't understate cost, and so promptTokens + outputTokens reconciles with
// the totalTokenCount the API reports.
export function billedOutputTokens(usage?: {
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
}): number {
  return (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);
}
