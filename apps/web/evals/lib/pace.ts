// Client-side rate limiter for the generation model. The Gemini free tier
// allows only a few requests/minute; the eval paces its own calls so the app's
// lib/ai code never has to see a 429. Override with EVAL_RPM if you have a
// higher quota.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Number(process.env.EVAL_RPM ?? 5);

const calls: number[] = [];

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function paceGenerate(): Promise<void> {
  for (;;) {
    const now = Date.now();
    while (calls.length && now - calls[0] > WINDOW_MS) calls.shift();
    if (calls.length < MAX_PER_WINDOW) {
      calls.push(now);
      return;
    }
    await sleep(WINDOW_MS - (now - calls[0]) + 300);
  }
}
