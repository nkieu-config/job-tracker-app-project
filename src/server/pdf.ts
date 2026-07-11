import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

export const MAX_PDF_PAGES = 50;

export class PdfTooLongError extends Error {
  constructor(readonly pages: number) {
    super(`This PDF has ${pages} pages (max ${MAX_PDF_PAGES}).`);
    this.name = "PdfTooLongError";
  }
}

// Extract plain text from a PDF. unpdf is built on a serverless-friendly
// build of pdf.js (no native deps / filesystem), so it runs on Vercel.
// The page count is checked before any text is pulled, so a small file that
// declares an enormous page tree can't pin the function.
// Throws if the PDF can't be parsed — callers should handle that.
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  if (pdf.numPages > MAX_PDF_PAGES) {
    throw new PdfTooLongError(pdf.numPages);
  }
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}
