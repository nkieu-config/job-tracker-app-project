import { describe, it, expect, afterEach, vi } from "vitest";
import { isAdminEmail, requireAdmin } from "@/server/admin";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const original = process.env.ADMIN_EMAILS;
afterEach(() => {
  process.env.ADMIN_EMAILS = original;
});

describe("isAdminEmail", () => {
  it("denies everyone when the allowlist is unset or empty", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("someone@example.com")).toBe(false);
    process.env.ADMIN_EMAILS = "";
    expect(isAdminEmail("someone@example.com")).toBe(false);
    process.env.ADMIN_EMAILS = "  , ,  ";
    expect(isAdminEmail("someone@example.com")).toBe(false);
  });

  it("denies a missing email even when the allowlist has entries", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("matches case-insensitively and tolerates whitespace", () => {
    process.env.ADMIN_EMAILS = " Admin@Example.com , second@example.com ";
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("ADMIN@EXAMPLE.COM")).toBe(true);
    expect(isAdminEmail("second@example.com")).toBe(true);
  });

  it("does not match on substrings or lookalikes", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    expect(isAdminEmail("admin@example.com.evil.com")).toBe(false);
    expect(isAdminEmail("notadmin@example.com")).toBe(false);
    expect(isAdminEmail("admin@example.co")).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("returns a scope for an allowlisted email", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(() => requireAdmin("boss@example.com")).not.toThrow();
  });

  it("refuses a non-admin by calling notFound", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(() => requireAdmin("someone@example.com")).toThrow();
    expect(notFound).toHaveBeenCalled();
  });

  it("refuses a missing email", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(() => requireAdmin(null)).toThrow();
  });
});
