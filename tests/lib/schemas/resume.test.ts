import { describe, it, expect } from "vitest";
import {
  firstUploadError,
  humanFileSize,
  MAX_LABEL_LENGTH,
  MAX_RESUME_BYTES,
} from "@/lib/schemas/resume";

describe("humanFileSize", () => {
  it("formats bytes, KB and MB", () => {
    expect(humanFileSize(512)).toBe("512 B");
    expect(humanFileSize(2048)).toBe("2 KB");
    expect(humanFileSize(4 * 1024 * 1024)).toBe("4.0 MB");
  });
});

const pdf = (bytes = "%PDF-1.7 ok") =>
  new File([bytes], "cv.pdf", { type: "application/pdf" });

describe("firstUploadError", () => {
  it("accepts a labelled PDF within the limits", () => {
    expect(firstUploadError({ label: "Backend v2", file: pdf() })).toBeNull();
  });

  it("rejects a blank label", () => {
    expect(firstUploadError({ label: "   ", file: pdf() })).toBe(
      "Give this version a label.",
    );
  });

  it("rejects a label past the shared maximum", () => {
    expect(
      firstUploadError({ label: "L".repeat(MAX_LABEL_LENGTH + 1), file: pdf() }),
    ).toBe(`Label must be ${MAX_LABEL_LENGTH} characters or fewer.`);
  });

  it("rejects a missing file", () => {
    expect(firstUploadError({ label: "Backend v2", file: null })).toBe(
      "Choose a PDF file.",
    );
  });

  it("rejects an empty file", () => {
    expect(firstUploadError({ label: "Backend v2", file: pdf("") })).toBe(
      "Choose a PDF file.",
    );
  });

  it("rejects a non-PDF content type", () => {
    const txt = new File(["hello"], "cv.txt", { type: "text/plain" });
    expect(firstUploadError({ label: "Backend v2", file: txt })).toBe(
      "Only PDF files are allowed.",
    );
  });

  it("rejects a file past the size cap", () => {
    const big = new File(["x".repeat(MAX_RESUME_BYTES + 1)], "cv.pdf", {
      type: "application/pdf",
    });
    expect(firstUploadError({ label: "Backend v2", file: big })).toContain(
      "File too large",
    );
  });
});
