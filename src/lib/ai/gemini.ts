import { GoogleGenAI } from "@google/genai";
import { AiError } from "@/lib/errors";

export const GENERATION_MODEL = "gemini-2.5-flash";
export const EMBEDDING_MODEL = "gemini-embedding-001";

// Single place that reads GEMINI_API_KEY. The key stays server-only; these
// helpers are imported exclusively from Server Actions and Route Handlers.
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiError("AI is not configured (missing GEMINI_API_KEY).");
  }
  return new GoogleGenAI({ apiKey });
}
