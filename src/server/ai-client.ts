import "server-only";

// Public AI surface for Server Actions and Route Handlers. The Gemini calls
// now run in-process (previously a separate Express service) — see lib/ai/*.
import { AiError } from "@/lib/errors";

export { AiError };
export { analyzeJobDescription } from "./ai/analyze";
export {
  embedText,
  embedTextBatch as embedTexts,
  embedDocument,
  type EmbeddingTask,
} from "./ai/embeddings";
export { tailorBulletsStream, interviewPrepStream } from "./ai/stream";
