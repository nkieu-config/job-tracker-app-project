import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const message = {
  to: "candidate@example.com",
  subject: "Reset your Applywise password",
  text: "Reset it here: https://example.com/reset-password/secret-token",
};

async function loadSendEmail(apiKey: string, nodeEnv: string) {
  vi.stubEnv("RESEND_API_KEY", apiKey);
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  const { sendEmail } = await import("@/server/email");
  return sendEmail;
}

beforeEach(() => {
  send.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendEmail without an API key", () => {
  it("logs the message outside production so the flow stays walkable", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const sendEmail = await loadSendEmail("", "development");

    await expect(sendEmail(message)).resolves.toBeUndefined();
    expect(info).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
  });

  it("throws in production instead of pretending it delivered", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const sendEmail = await loadSendEmail("", "production");

    await expect(sendEmail(message)).rejects.toThrow(/not configured/i);
    expect(send).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it("never writes the tokenised link to the log in production", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const sendEmail = await loadSendEmail("", "production");

    await sendEmail(message).catch(() => {});

    const logged = info.mock.calls.flat().join(" ");
    expect(logged).not.toContain("secret-token");
  });
});

describe("sendEmail with an API key", () => {
  it("resolves when Resend accepts the message", async () => {
    send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
    const sendEmail = await loadSendEmail("re_test_key", "production");

    await expect(sendEmail(message)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledOnce();
  });

  it("throws when Resend reports a delivery error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockResolvedValue({
      data: null,
      error: { message: "domain is not verified" },
    });
    const sendEmail = await loadSendEmail("re_test_key", "production");

    await expect(sendEmail(message)).rejects.toThrow(/delivery failed/i);
  });

  it("throws when the Resend call itself rejects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockRejectedValue(new Error("network unreachable"));
    const sendEmail = await loadSendEmail("re_test_key", "production");

    await expect(sendEmail(message)).rejects.toThrow(/delivery failed/i);
  });
});
