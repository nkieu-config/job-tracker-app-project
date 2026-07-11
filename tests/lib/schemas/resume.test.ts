import { describe, it, expect } from "vitest";
import { humanFileSize } from "@/lib/schemas/resume";

describe("humanFileSize", () => {
  it("formats bytes, KB and MB", () => {
    expect(humanFileSize(512)).toBe("512 B");
    expect(humanFileSize(2048)).toBe("2 KB");
    expect(humanFileSize(4 * 1024 * 1024)).toBe("4.0 MB");
  });
});
