import { describe, it, expect } from "vitest";
import {
  applicationInputSchema,
  applicationInputFromFormData,
} from "@/lib/validations/application";

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("applicationInputSchema", () => {
  it("accepts valid input and coerces/normalizes fields", () => {
    const parsed = applicationInputSchema.safeParse(
      applicationInputFromFormData(
        formData({
          company: "Acme",
          role: "Backend Engineer",
          status: "APPLIED",
          jobUrl: "",
          deadline: "2026-12-01",
          jobDescription: "",
          notes: "  ",
        }),
      ),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.company).toBe("Acme");
      expect(parsed.data.status).toBe("APPLIED");
      expect(parsed.data.jobUrl).toBeNull(); // empty -> null
      expect(parsed.data.notes).toBeNull(); // whitespace -> null
      expect(parsed.data.deadline).toBeInstanceOf(Date);
    }
  });

  it("rejects a missing company", () => {
    const parsed = applicationInputSchema.safeParse(
      applicationInputFromFormData(
        formData({ company: "", role: "Dev", status: "SAVED" }),
      ),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid job URL", () => {
    const parsed = applicationInputSchema.safeParse(
      applicationInputFromFormData(
        formData({
          company: "Acme",
          role: "Dev",
          status: "SAVED",
          jobUrl: "not-a-url",
        }),
      ),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const parsed = applicationInputSchema.safeParse(
      applicationInputFromFormData(
        formData({ company: "Acme", role: "Dev", status: "PENDING" }),
      ),
    );
    expect(parsed.success).toBe(false);
  });
});
