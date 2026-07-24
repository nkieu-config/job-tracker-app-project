import "server-only";

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Applywise <onboarding@resend.dev>";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const emailIsDeliverable =
  Boolean(RESEND_API_KEY) || process.env.NODE_ENV !== "production";

export async function sendEmail({
  to,
  subject,
  text,
}: SendEmailInput): Promise<void> {
  if (!resend) {
    if (!emailIsDeliverable) {
      throw new Error(
        `Email is not configured (RESEND_API_KEY unset) — cannot deliver "${subject}".`,
      );
    }
    console.info(`[email:dev] to=${to} subject=${subject}\n${text}`);
    return;
  }

  let result;
  try {
    result = await resend.emails.send({ from: EMAIL_FROM, to, subject, text });
  } catch (cause) {
    console.error(`[email] send threw to=${to} subject=${subject}`, cause);
    throw new Error(`Email delivery failed for "${subject}".`, { cause });
  }

  if (result.error) {
    console.error(
      `[email] send failed to=${to} subject=${subject}`,
      result.error,
    );
    throw new Error(`Email delivery failed for "${subject}".`, {
      cause: result.error,
    });
  }
}
