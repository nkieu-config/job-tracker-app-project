import { GoogleGenAI } from "@google/genai";
import { AiError } from "./analyze-jd";

export const EMBEDDING_DIM = 768;
const MODEL = "gemini-embedding-001";
// Keep input within the model's token budget; resumes/JDs are rarely longer.
const MAX_INPUT_CHARS = 8000;

export type EmbeddingTask =
  | "RETRIEVAL_QUERY"
  | "RETRIEVAL_DOCUMENT"
  | "SEMANTIC_SIMILARITY";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiError("AI is not configured (missing GEMINI_API_KEY).");
  }
  return new GoogleGenAI({ apiKey });
}

export async function embedText(
  text: string,
  taskType: EmbeddingTask = "SEMANTIC_SIMILARITY",
): Promise<number[]> {
  const ai = getClient();
  const input = text.slice(0, MAX_INPUT_CHARS);

  let res;
  try {
    res = await ai.models.embedContent({
      model: MODEL,
      contents: input,
      config: { taskType, outputDimensionality: EMBEDDING_DIM },
    });
  } catch {
    throw new AiError("Failed to generate embeddings. Please try again.");
  }

  const values = res.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIM) {
    throw new AiError("The embedding had an unexpected size.");
  }
  return values;
}
