"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { inputClass, labelClass } from "@/components/ui/form-styles";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      if (error) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <p
        role="status"
        className="rounded-lg bg-canvas-lavender px-4 py-3 text-center font-sans text-body text-ink"
      >
        If an account exists for <b>{email}</b>, we&apos;ve sent it a reset
        link. It expires in 1 hour.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className={labelClass}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className={inputClass}
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-canvas-error px-4 py-3 text-body text-semantic-error font-medium"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-body-lg tracking-[0.2px] py-3.5 px-7 rounded-pill transition-colors hover:bg-primary-press disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
