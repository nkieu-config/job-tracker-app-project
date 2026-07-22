import "server-only";

import { GoogleGenAI } from "@google/genai";
import { AiError } from "@/lib/errors";

// Re-exported so callers keep a single import site; the constants live apart so
// the data layer can name a model without loading the Gemini SDK.
export {
  GENERATION_MODEL,
  TAILORING_MODEL,
  EMBEDDING_MODEL,
  thinkingOffFor,
  billedOutputTokens,
} from "./models";

// Single place that reads GEMINI_API_KEY. The key stays server-only; these
// helpers are imported exclusively from Server Actions and Route Handlers.
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiError(
      "AI is not configured (missing GEMINI_API_KEY).",
      "config",
    );
  }
  return new GoogleGenAI({ apiKey });
}
