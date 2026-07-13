import { describe, it, expect, vi, beforeEach } from "vitest";

const getDocumentProxy = vi.fn();
const extractText = vi.fn();
vi.mock("unpdf", () => ({
  getDocumentProxy: (...a: unknown[]) => getDocumentProxy(...a),
  extractText: (...a: unknown[]) => extractText(...a),
}));

const { extractPdfText, PdfTooLongError, MAX_PDF_PAGES } = await import(
  "@/server/pdf"
);

const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

beforeEach(() => {
  getDocumentProxy.mockReset().mockResolvedValue({ numPages: 2 });
  extractText.mockReset().mockResolvedValue({ text: "  resume text  " });
});

describe("extractPdfText", () => {
  it("returns the merged text of every page, trimmed", async () => {
    await expect(extractPdfText(bytes)).resolves.toBe("resume text");
    expect(extractText).toHaveBeenCalledWith(
      { numPages: 2 },
      { mergePages: true },
    );
  });

  it("accepts a PDF sitting exactly on the page cap", async () => {
    getDocumentProxy.mockResolvedValue({ numPages: MAX_PDF_PAGES });
    await expect(extractPdfText(bytes)).resolves.toBe("resume text");
  });

  // The guard that stops a small file declaring an enormous page tree from
  // pinning the function. It must reject *before* any text is pulled — the
  // rejection is worthless if the expensive work already ran.
  it("rejects a PDF past the page cap without extracting any text", async () => {
    getDocumentProxy.mockResolvedValue({ numPages: MAX_PDF_PAGES + 1 });

    await expect(extractPdfText(bytes)).rejects.toBeInstanceOf(PdfTooLongError);
    expect(extractText).not.toHaveBeenCalled();
  });

  it("reports the real page count so the user knows how far over they are", async () => {
    getDocumentProxy.mockResolvedValue({ numPages: 500 });

    const err = await extractPdfText(bytes).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PdfTooLongError);
    expect((err as InstanceType<typeof PdfTooLongError>).pages).toBe(500);
    expect((err as Error).message).toContain("500");
    expect((err as Error).message).toContain(String(MAX_PDF_PAGES));
  });

  it("propagates an unparseable PDF rather than returning empty text", async () => {
    getDocumentProxy.mockRejectedValue(new Error("Invalid PDF structure"));

    await expect(extractPdfText(bytes)).rejects.toThrow("Invalid PDF structure");
    expect(extractText).not.toHaveBeenCalled();
  });
});
