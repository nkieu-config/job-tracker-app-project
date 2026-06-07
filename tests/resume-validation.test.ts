import { describe, it, expect } from "vitest";
import {
  humanFileSize,
  MAX_RESUME_BYTES,
  ACCEPTED_RESUME_TYPE,
  PDF_MAGIC,
} from "@/lib/validations/resume";

describe("humanFileSize", () => {
  it("formats bytes, KB and MB", () => {
    expect(humanFileSize(512)).toBe("512 B");
    expect(humanFileSize(2048)).toBe("2 KB");
    expect(humanFileSize(4 * 1024 * 1024)).toBe("4.0 MB");
  });
});

describe("resume upload constants", () => {
  it("limits uploads to 4 MB of PDF", () => {
    expect(MAX_RESUME_BYTES).toBe(4 * 1024 * 1024);
    expect(ACCEPTED_RESUME_TYPE).toBe("application/pdf");
    expect(PDF_MAGIC).toBe("%PDF-");
  });
});
