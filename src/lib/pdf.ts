import { extractText } from "unpdf";

// Extract plain text from a PDF. unpdf is built on a serverless-friendly
// build of pdf.js (no native deps / filesystem), so it runs on Vercel.
// Throws if the PDF can't be parsed — callers should handle that.
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { text } = await extractText(bytes, { mergePages: true });
  return text.trim();
}
